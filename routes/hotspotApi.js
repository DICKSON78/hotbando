// routes/hotspotApi.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const hotspotController = require('../controllers/hotspotController');
const mikrotikService = require('../utils/mikrotik');
const { getRealClientMAC, getRealSSID, formatRemainingTime } = hotspotController.helpers;
const { authRateLimit } = require('../middleware/security');

function publicSessionUser(user) {
    if (!user) return null;
    const { password, reset_token, reset_token_expiry, verification_code, ...safe } = user;
    return safe;
}

// Establish device session (mirrors GET /hotspot)
router.get('/session', async (req, res) => {
    try {
        const explicitRouterID = req.query.routerID || req.query.routerid || req.query.router_id;
        const candidates = [...new Set([
            explicitRouterID,
            req.session.routerID,
            req.session.hotbando_user?.last_router_id
        ].filter(Boolean))];

        // Only accept a router that is actually registered. A stale or
        // fabricated id (ROUTER_DEFAULT) must never overwrite a valid session.
        let registeredRouter = null;
        for (const candidateRouter of candidates) {
            try {
                const [routers] = await db.execute(
                    `SELECT m.id, m.router_id, m.router_name, m.status, m.ssid, m.latitude, m.longitude,
                            COALESCE(l.name, m.router_name, 'Tanzania') AS location
                     FROM mikrotiks m
                     LEFT JOIN locations l ON m.location_id = l.id
                     WHERE m.router_id = ? AND m.is_active = 1`,
                    [candidateRouter]
                );
                if (routers.length > 0) {
                    registeredRouter = routers[0];
                    break;
                }
            } catch (_) {}
        }

        let mac = getRealClientMAC(req) || req.session.mac || null;
        const ssidshow = getRealSSID(req);
        const location = registeredRouter
            ? registeredRouter.location
            : (req.session.location || 'Tanzania');

        req.session.mac = mac || req.session.mac;
        req.session.routerID = registeredRouter ? registeredRouter.router_id : null;
        req.session.ssidshow = ssidshow || req.session.ssidshow;
        req.session.location = location;
        req.session.onWifi = !!registeredRouter;
        req.session.clientIP = req.ip;
        req.session.userAgent = req.headers['user-agent'];

        res.json({
            mac: req.session.mac || '',
            routerID: req.session.routerID || '',
            ssidshow: req.session.ssidshow || '',
            location: req.session.location || '',
            onWifi: req.session.onWifi,
            registeredRouter,
            user: publicSessionUser(req.session.hotbando_user)
        });
    } catch (error) {
        console.error('❌ API session error:', error);
        res.status(500).json({ error: 'Imeshindikana kuweka kikao.' });
    }
});

// Login / register / voucher / ads delegate to controller (JSON-aware)
// Strict rate limit on auth endpoints: 5 attempts per 15 min per IP
router.post('/login', authRateLimit, hotspotController.loginUser);
router.post('/register', authRateLimit, hotspotController.register);
router.post('/connect', requireWifi, hotspotController.connect);
router.post('/disconnect', requireWifi, hotspotController.disconnect);
router.post('/voucher', requireWifi, hotspotController.voucher);
router.post('/voucher/redeem', requireWifi, hotspotController.voucher);
router.get('/get-ad', requireWifi, hotspotController.getAd);
router.get('/ads/random', requireWifi, hotspotController.getAd);
router.get('/ads-list', requireWifi, hotspotController.getAdsList);
router.post('/complete-ad', requireWifi, hotspotController.completeAd);
router.post('/ads/complete', requireWifi, hotspotController.completeAd);

// Active internet packages for the subscribe page
router.get('/packages', async (req, res) => {
    try {
        const [packages] = await db.execute(
            'SELECT id, name, description, price, duration_hours FROM packages WHERE is_active = 1 ORDER BY duration_hours ASC'
        );
        res.json({ packages });
    } catch (error) {
        console.error('❌ API packages error:', error);
        res.status(500).json({ error: 'Imeshindikana kupata kifurushi.' });
    }
});

// Middleware: require WiFi connection from registered MikroTik
async function requireWifi(req, res, next) {
    // Heal stale sessions: a logged-in user's bound router counts as on-WiFi
    if (!req.session.onWifi && req.session.hotbando_user?.last_router_id) {
        try {
            const [routers] = await db.execute(
                'SELECT router_id FROM mikrotiks WHERE router_id = ? AND is_active = 1',
                [req.session.hotbando_user.last_router_id]
            );
            if (routers.length > 0) {
                req.session.routerID = routers[0].router_id;
                req.session.onWifi = true;
            }
        } catch (_) {}
    }
    if (!req.session.onWifi) {
        return res.status(403).json({
            error: 'Please connect to HotBando WiFi first.',
            onWifi: false,
            redirectTo: '/hotspot'
        });
    }
    next();
}

// JSON dashboard data
router.get('/dashboard', requireWifi, async (req, res) => {
    if (!req.session.hotbando_user) {
        return res.status(401).json({ error: 'Umelazimika kuingia kwenye akaunti yako.' });
    }

    try {
        const [freshUsers] = await db.execute(
            'SELECT * FROM users WHERE id = ?',
            [req.session.hotbando_user.id]
        );
        if (freshUsers.length === 0) {
            return res.status(401).json({ error: 'Akaunti haipatikani.' });
        }
        req.session.hotbando_user = { ...publicSessionUser(freshUsers[0]), mac_address: req.session.hotbando_user.mac_address, last_router_id: req.session.hotbando_user.last_router_id };
        const user = req.session.hotbando_user;
        const now = new Date();
        const usageUntil = new Date(user.usage_until);
        const isActive = now < usageUntil;
        const remainingSeconds = isActive ? Math.max(0, (usageUntil - now) / 1000) : 0;
        const freeMB = user.free_bytes / (1024 * 1024);

        const [todayViews] = await db.execute(
            'SELECT COUNT(*) as count FROM ad_views WHERE user_id = ? AND DATE(created_at) = CURDATE()',
            [user.id]
        );

        const [adLimitSetting] = await db.execute(
            'SELECT setting_value FROM system_settings WHERE setting_key = "daily_ad_limit"'
        );
        const dailyAdLimit = adLimitSetting.length > 0 ? parseInt(adLimitSetting[0].setting_value) : 8;

        const adsWatchedToday = todayViews[0].count;
        const adsRemaining = Math.max(0, dailyAdLimit - adsWatchedToday);

        res.json({
            user: {
                id: user.id,
                name: user.name,
                phone_number: user.phone_number,
                package: user.package,
                moneyspent: user.moneyspent,
                free_bytes: user.free_bytes,
                usage_start: user.usage_start,
                usage_until: user.usage_until
            },
            location: req.session.location,
            routerID: req.session.routerID,
            ssidshow: req.session.ssidshow,
            mac: req.session.mac || user.mac_address || '00:00:00:00:00:00',
            clientIP: req.session.clientIP || req.ip,
            isActive,
            remainingSeconds: Math.round(remainingSeconds),
            remainingTime: formatRemainingTime(remainingSeconds),
            freeMB: freeMB.toFixed(2),
            adsWatchedToday,
            adsRemaining,
            dailyAdLimit,
            canWatchAds: adsRemaining > 0,
            routerStatus: 'registered',
            connectedUsers: null,
            routerMessage: 'Umeunganishwa kwenye mtandao wa HotBando.'
        });
    } catch (error) {
        console.error('❌ API dashboard error:', error);
        res.status(500).json({ error: 'Imeshindikana kupata taarifa za akaunti.' });
    }
});

// Data usage endpoint (for real-time usage polling)
router.get('/usage', requireWifi, async (req, res) => {
    const user = req.session.hotbando_user;
    if (!user) {
        return res.status(401).json({ error: 'Umelazimika kuingia kwenye akaunti yako.' });
    }
    try {
        const [users] = await db.execute(
            'SELECT free_bytes, usage_until, moneyspent, package FROM users WHERE id = ?',
            [user.id]
        );
        if (users.length === 0) {
            return res.status(404).json({ error: 'Akaunti haipatikani.' });
        }
        const fresh = users[0];
        req.session.hotbando_user = { ...req.session.hotbando_user, ...fresh };
        const now = new Date();
        const usageUntil = new Date(fresh.usage_until);
        const remainingSeconds = now < usageUntil ? Math.max(0, (usageUntil - now) / 1000) : 0;
        res.json({
            freeMB: (fresh.free_bytes / (1024 * 1024)).toFixed(2),
            free_bytes: fresh.free_bytes,
            isActive: now < usageUntil,
            remainingSeconds: Math.round(remainingSeconds),
            remainingTime: formatRemainingTime(remainingSeconds),
            package: fresh.package,
            moneyspent: fresh.moneyspent
        });
    } catch (error) {
        console.error('❌ API usage error:', error);
        res.status(500).json({ error: 'Imeshindikana kupata matumizi.' });
    }
});

// Payment confirmations and failures remain available after the checkout modal closes.
router.get('/notifications', async (req, res) => {
    const user = req.session.hotbando_user;
    if (!user?.id) return res.status(401).json({ error: 'Umelazimika kuingia kwenye akaunti yako.' });
    try {
        const [rows] = await db.execute(
            `SELECT id, notification_type, title, message, action_url, action_text, is_read, created_at
             FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
            [user.id]
        );
        res.json({ notifications: rows });
    } catch (error) {
        console.error('Hotspot notifications error:', error);
        res.status(500).json({ error: 'Imeshindikana kupata ujumbe.' });
    }
});

// Logout (JSON)
router.get('/logout', async (req, res) => {
    const user = req.session.hotbando_user;
    if (user) {
        try {
            await mikrotikService.removeUserFromRouter(user.mac_address, user.last_router_id);
        } catch (routerError) {
            console.warn('⚠️ Could not remove user from router during logout:', routerError.message);
        }
    }
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

module.exports = router;
