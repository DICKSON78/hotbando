// routes/hotspotApi.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const hotspotController = require('../controllers/hotspotController');
const mikrotikService = require('../utils/mikrotik');
const { getRealClientMAC, getRealRouterID, getRealSSID, getRealLocation, formatRemainingTime } = hotspotController.helpers;
const { authRateLimit } = require('../middleware/security');

// Establish device session (mirrors GET /hotspot)
router.get('/session', async (req, res) => {
    try {
        const mac = getRealClientMAC(req);
        const routerID = getRealRouterID(req);
        const ssidshow = getRealSSID(req);
        const location = await getRealLocation(routerID);

        // Only update session WiFi info if request has explicit routerID param
        // (from MikroTik captive portal redirect) OR if session already has a valid one
        const hasExplicitRouter = req.query.routerID || req.query.routerid || req.query.router_id;
        if (hasExplicitRouter) {
            // Validate against DB
            let onWifi = false;
            let registeredRouter = null;
            try {
                const [routers] = await db.execute(
                    'SELECT id, router_id, router_name, status, ssid, latitude, longitude FROM mikrotiks WHERE router_id = ? AND is_active = 1',
                    [routerID]
                );
                if (routers.length > 0) {
                    onWifi = true;
                    registeredRouter = routers[0];
                }
            } catch (_) {}

            req.session.mac = mac;
            req.session.routerID = routerID;
            req.session.ssidshow = ssidshow;
            req.session.location = location;
            req.session.onWifi = onWifi;
            req.session.clientIP = req.ip;
            req.session.userAgent = req.headers['user-agent'];
        } else if (req.session.routerID) {
            // Re-validate existing routerID
            let onWifi = false;
            let registeredRouter = null;
            try {
                const [routers] = await db.execute(
                    'SELECT id, router_id, router_name, status, ssid, latitude, longitude FROM mikrotiks WHERE router_id = ? AND is_active = 1',
                    [req.session.routerID]
                );
                if (routers.length > 0) {
                    onWifi = true;
                    registeredRouter = routers[0];
                }
            } catch (_) {}
            req.session.onWifi = onWifi;
        }

        res.json({
            mac: req.session.mac || mac,
            routerID: req.session.routerID || '',
            ssidshow: req.session.ssidshow || ssidshow,
            location: req.session.location || location,
            onWifi: req.session.onWifi || false,
            registeredRouter: null,
            user: req.session.hotbando_user || null
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
router.post('/voucher', requireWifi, hotspotController.voucher);
router.get('/get-ad', requireWifi, hotspotController.getAd);
router.get('/ads-list', requireWifi, hotspotController.getAdsList);
router.post('/complete-ad', requireWifi, hotspotController.completeAd);

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
        req.session.hotbando_user = { ...freshUsers[0], mac_address: req.session.hotbando_user.mac_address, last_router_id: req.session.hotbando_user.last_router_id };
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

        // MikroTik calls with fast timeout — don't block dashboard if router unreachable
        let routerOnline = false;
        let connectedUsers = 0;
        try {
            const routerPromise = mikrotikService.checkRouterStatus(req.session.routerID || 'router-default');
            const result = await Promise.race([
                routerPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Router timeout')), 5000))
            ]);
            routerOnline = result?.online || false;
        } catch (_) {}

        try {
            const sessionsPromise = mikrotikService.getActiveSessions(req.session.routerID || 'router-default');
            const sessions = await Promise.race([
                sessionsPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Router timeout')), 5000))
            ]);
            connectedUsers = sessions?.length || 0;
        } catch (_) {}

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
            remainingTime: formatRemainingTime(remainingSeconds),
            freeMB: freeMB.toFixed(2),
            adsWatchedToday,
            adsRemaining,
            dailyAdLimit,
            canWatchAds: adsRemaining > 0,
            routerStatus: routerOnline ? 'online' : 'offline',
            connectedUsers,
            routerMessage: routerOnline ?
                `Mtandao upo tayari (${connectedUsers} watumiaji wanaotumia)` :
                'Kuna changamoto ndogo kwenye mtandao, lakini bado unaweza kutumia internet'
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
            remainingTime: formatRemainingTime(remainingSeconds),
            package: fresh.package,
            moneyspent: fresh.moneyspent
        });
    } catch (error) {
        console.error('❌ API usage error:', error);
        res.status(500).json({ error: 'Imeshindikana kupata matumizi.' });
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
