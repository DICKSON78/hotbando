const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const hotspotAuthController = require('../controllers/hotspotAuthController');

// Admin Authentication Routes
router.get('/admin/login', adminAuthController.showLogin);
router.post('/admin/login', adminAuthController.login);
router.get('/admin/logout', adminAuthController.logout);

// Customer Authentication Routes (Hotspot)
router.get('/hotspot/login', hotspotAuthController.showLogin);
router.post('/hotspot/login', hotspotAuthController.login);
router.get('/hotspot/logout', hotspotAuthController.logout);

// Customer Registration
router.post('/hotspot/register', hotspotAuthController.register);

module.exports = router;