// routes/hotspot.js
const express = require('express');
const router = express.Router();
const hotspotController = require('../controllers/hotspotController');
const paymentController = require('../controllers/paymentController');
const db = require('../config/database');
const { authRateLimit } = require('../middleware/security');

// Middleware: validate registered MikroTik WiFi for API routes
async function requireWifiApi(req, res, next) {
    let routerID = req.session?.routerID;
    const valid = async (id) => {
        if (!id) return false;
        try {
            const [routers] = await db.execute(
                'SELECT id FROM mikrotiks WHERE router_id = ? AND is_active = 1', [id]
            );
            return routers.length > 0;
        } catch (_) { return false; }
    };
    // Fallback: a logged-in user's bound router heals a stale/missing session router
    if (!await valid(routerID)) {
        const bound = req.session?.hotbando_user?.last_router_id;
        if (await valid(bound)) {
            routerID = bound;
            req.session.routerID = bound;
        }
    }
    if (!routerID) {
        return res.status(403).json({ error: 'Connect to HotBando WiFi first.', onWifi: false });
    }
    try {
        if (!await valid(routerID)) {
            return res.status(403).json({ error: 'This WiFi network is not registered with HotBando.', onWifi: false });
        }
        req.session.onWifi = true;
        next();
    } catch (_) {
        return res.status(403).json({ error: 'WiFi validation failed.', onWifi: false });
    }
}

// ==================== PAGE ROUTES ====================
router.get('/', hotspotController.index);
router.get('/login', hotspotController.login);
router.get('/signup', hotspotController.signup);
router.get('/dashboard', hotspotController.dashboard);
router.get('/subscription', hotspotController.subscription);
router.get('/advertise', hotspotController.advertise);
router.get('/empty', hotspotController.empty);

// ==================== API ROUTES (WiFi-protected) ====================
router.post('/login', authRateLimit, hotspotController.loginUser);
router.post('/register', authRateLimit, hotspotController.register);
router.post('/connect', requireWifiApi, hotspotController.connect);
router.post('/disconnect', requireWifiApi, hotspotController.disconnect);
router.get('/get-ad', requireWifiApi, hotspotController.getAd);
router.post('/complete-ad', requireWifiApi, hotspotController.completeAd);
router.post('/voucher', requireWifiApi, hotspotController.voucher);
router.post('/voucher/redeem', requireWifiApi, hotspotController.voucher);
router.post('/purchase-package', requireWifiApi, hotspotController.purchasePackage);
router.get('/health-check', hotspotController.healthCheck);
router.post('/reset-password', hotspotController.resetPassword);
router.get('/device-status', hotspotController.getDeviceStatus);
router.get('/user-info/:phone_number', hotspotController.getUserInfo);
router.post('/logout', hotspotController.logout);

// Routes za matangazo (WiFi-protected)
router.get('/ads/get-random', requireWifiApi, hotspotController.getAd);
router.post('/ads/complete', requireWifiApi, hotspotController.completeAd);
router.get('/advertise', hotspotController.advertise);

// PesaPal payment routes (used by subscription page)
router.post('/payment/direct', paymentController.initiatePayment);
router.post('/payment/check-status', paymentController.checkPaymentStatus);

module.exports = router;