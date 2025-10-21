const express = require('express');
const router = express.Router();
const mikrotikService = require('../utils/mikrotik');

// Test router connection
router.get('/test/:routerID', async (req, res) => {
    try {
        const { routerID } = req.params;
        const result = await mikrotikService.testConnection(routerID);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get router health
router.get('/health/:routerID', async (req, res) => {
    try {
        const { routerID } = req.params;
        const health = await mikrotikService.getRouterHealth(routerID);
        
        res.json({
            success: true,
            data: health
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get hotspot users
router.get('/users/:routerID', async (req, res) => {
    try {
        const { routerID } = req.params;
        const users = await mikrotikService.getHotspotUsers(routerID);
        
        res.json({
            success: true,
            data: users,
            count: users.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get active sessions
router.get('/sessions/:routerID', async (req, res) => {
    try {
        const { routerID } = req.params;
        const sessions = await mikrotikService.getActiveSessions(routerID);
        
        res.json({
            success: true,
            data: sessions,
            count: sessions.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Check user status
router.get('/user/:mac/:routerID', async (req, res) {
    try {
        const { mac, routerID } = req.params;
        const exists = await mikrotikService.checkUserExists(mac, routerID);
        
        res.json({
            success: true,
            exists: exists,
            mac: mac
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Add user to router
router.post('/user/:mac/:routerID', async (req, res) => {
    try {
        const { mac, routerID } = req.params;
        const success = await mikrotikService.addUserToRouter(mac, routerID);
        
        res.json({
            success: success,
            message: success ? 'User added successfully' : 'Failed to add user',
            mac: mac
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Remove user from router
router.delete('/user/:mac/:routerID', async (req, res) => {
    try {
        const { mac, routerID } = req.params;
        const success = await mikrotikService.removeUserFromRouter(mac, routerID);
        
        res.json({
            success: success,
            message: success ? 'User removed successfully' : 'Failed to remove user',
            mac: mac
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Reboot router
router.post('/reboot/:routerID', async (req, res) => {
    try {
        const { routerID } = req.params;
        const success = await mikrotikService.rebootRouter(routerID);
        
        res.json({
            success: success,
            message: success ? 'Reboot command sent' : 'Failed to send reboot command'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;