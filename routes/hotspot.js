// routes/hotspot.js
const express = require('express');
const router = express.Router();
const hotspotController = require('../controllers/hotspotController');

// ==================== PAGE ROUTES ====================
router.get('/', hotspotController.index);
router.get('/login', hotspotController.login);
router.get('/signup', hotspotController.signup);
router.get('/dashboard', hotspotController.dashboard);
router.get('/subscription', hotspotController.subscription);
router.get('/advertise', hotspotController.advertise);
router.get('/empty', hotspotController.empty);

// ==================== API ROUTES ====================
router.post('/login', hotspotController.loginUser);
router.post('/register', hotspotController.register);
router.post('/connect', hotspotController.connect);
router.post('/disconnect', hotspotController.disconnect);
router.get('/get-ad', hotspotController.getAd);
router.post('/complete-ad', hotspotController.completeAd);
router.post('/voucher', hotspotController.voucher);
router.post('/purchase-package', hotspotController.purchasePackage);
router.get('/health-check', hotspotController.healthCheck);
router.post('/reset-password', hotspotController.resetPassword);
router.get('/device-status', hotspotController.getDeviceStatus);
router.get('/user-info/:phone_number', hotspotController.getUserInfo);
router.post('/logout', hotspotController.logout);

// Routes za matangazo
router.get('/ads/get-random', hotspotController.getAd);
router.post('/ads/complete', hotspotController.completeAd);
router.get('/advertise', hotspotController.advertise);

module.exports = router;