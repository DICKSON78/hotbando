/**
 * Router Routes
 * Uses adminController for router management
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuth } = require('../middleware/authMiddleware');

// All router routes require admin authentication
router.use(adminAuth);

// Get all routers
router.get('/', adminController.getRouters);

// Get router health
router.get('/health', adminController.getRouterHealth);

// Get status for all routers (live check)
router.get('/status-all', adminController.getAllRoutersStatus);

// Get single router by ID
router.get('/:id', adminController.getRouterById);

// Get router live status
router.get('/:routerID/status', adminController.getRouterLiveStatus);

// Get router sessions (hotspot active)
router.get('/:routerID/sessions', adminController.getRouterSessions);

// Get hotspot sessions
router.get('/:routerID/hotspot/sessions', adminController.getRouterHotspotSessions);

// Get hotspot users
router.get('/:routerID/hotspot/users', adminController.getRouterHotspotUsers);

// Kick hotspot user
router.post('/:routerID/hotspot/kick', adminController.kickHotspotUser);

// Get IP bindings
router.get('/:routerID/bindings', adminController.getRouterBindings);

// Get interfaces
router.get('/:routerID/interfaces', adminController.getRouterInterfaces);

// Get logs
router.get('/:routerID/logs', adminController.getRouterLogs);

// Get router active users with subscription details
router.get('/:routerID/active-users', adminController.getRouterActiveUsers);

// Get detailed router info with owner and coverage
router.get('/:routerID/details', adminController.getRouterDetails);

// Reboot router
router.post('/:routerID/reboot', adminController.rebootRouter);

// Add router
router.post('/', adminController.addRouter);

// Update router
router.put('/:id', adminController.updateRouter);

// Delete router
router.delete('/:id', adminController.deleteRouter);

// WireGuard endpoints
router.get('/wireguard/peers', adminController.getWireGuardPeers);
router.get('/wireguard/server-config', adminController.getWireGuardServerConfig);
router.post('/wireguard/generate/:routerID', adminController.generateWireGuardConfig);
router.get('/wireguard/vps-guide', adminController.getVpsSetupGuide);

module.exports = router;
