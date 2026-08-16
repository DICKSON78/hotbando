// routes/hotspotApi.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const hotspotController = require('../controllers/hotspotController');
const mikrotikService = require('../utils/mikrotik');
const { getRealClientMAC, getRealRouterID, getRealSSID, getRealLocation, formatRemainingTime } = hotspotController.helpers;

// Establish device session (mirrors GET /hotspot)
router.get('/session', async (req, res) => {
    try {
        const mac = getRealClientMAC(req);
        const routerID = getRealRouterID(req);
        const ssidshow = getRealSSID(req);
        const location = await getRealLocation(routerID);

        req.session.mac = mac;
        req.session.routerID = routerID;
        req.session.ssidshow = ssidshow;
        req.session.location = location;
        req.session.clientIP = req.ip;
        req.session.userAgent = req.headers['user-agent'];

        res.json({
            mac,
            routerID,
            ssidshow,
            location,
            user: req.session.hotbando_user || null
        });
    } catch (error) {
        console.error('❌ API session error:', error);
        res.status(500).json({ error: 'Imeshindikana kuweka kikao.' });
    }
});

// Login / register / voucher / ads delegate to controller (JSON-aware)
router.post('/login', hotspotController.loginUser);
router.post('/register', hotspotController.register);
router.post('/voucher', hotspotController.voucher);
router.get('/get-ad', hotspotController.getAd);
router.post('/complete-ad', hotspotController.completeAd);

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

// JSON dashboard data
router.get('/dashboard', async (req, res) => {
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

        const routerStatus = await mikrotikService.checkRouterStatus(req.session.routerID || 'router-default');

        let connectedUsers = 0;
        try {
            const sessions = await mikrotikService.getActiveSessions(req.session.routerID || 'router-default');
            connectedUsers = sessions.length;
        } catch (error) {
            console.warn('⚠️ Could not get connected users count:', error.message);
        }

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
            routerStatus: routerStatus.status,
            connectedUsers,
            routerMessage: routerStatus.isOnline ?
                `Mtandao upo tayari (${connectedUsers} watumiaji wanaotumia)` :
                'Kuna changamoto ndogo kwenye mtandao, lakini bado unaweza kutumia internet'
        });
    } catch (error) {
        console.error('❌ API dashboard error:', error);
        res.status(500).json({ error: 'Imeshindikana kupata taarifa za akaunti.' });
    }
});

// Data usage endpoint (for real-time usage polling)
router.get('/usage', async (req, res) => {
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
