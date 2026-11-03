const db = require('../config/database');
const bcrypt = require('bcryptjs');
const mikrotikService = require('../utils/mikrotik');

async function debugFullLogin(req, res) {
    try {
        const phone = '0776126464';
        const password = '123456';
        
        const [users] = await db.execute(
            'SELECT * FROM users WHERE phone_number = ? AND role = "customer" AND is_active = 1',
            [phone]
        );
        
        if (users.length === 0) {
            return res.json({ step: 'user_lookup', result: 'not_found' });
        }
        
        const user = users[0];
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.json({ step: 'password_check', result: 'invalid' });
        }
        
        // Test getRealClientMAC (not a method, it's a local function)
        // Test router resolution
        let currentRouterID = null;
        try {
            const explicitRouter = null;
            currentRouterID = await resolveRegisteredRouter(explicitRouter);
            if (!currentRouterID) {
                currentRouterID = await resolveRegisteredRouter(req.session.routerID);
            }
            if (!currentRouterID) {
                currentRouterID = await resolveRegisteredRouter(user.last_router_id);
            }
        } catch (e) {
            return res.json({ step: 'router_resolution', error: e.message });
        }
        
        // Test MAC resolution (with timeout)
        let currentMAC = null;
        if (!currentMAC && currentRouterID) {
            try {
                currentMAC = await Promise.race([
                    mikrotikService.resolveClientMAC(currentRouterID, req.ip),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('MAC resolution timeout')), 5000))
                ]);
            } catch (e) {
                return res.json({ step: 'mac_resolution', error: e.message, routerID: currentRouterID, ip: req.ip });
            }
        }
        
        if (!currentMAC) {
            currentMAC = user.mac_address ? user.mac_address : null;
        }
        
        // Test location resolution
        let currentLocation = null;
        try {
            currentLocation = await getRealLocation(currentRouterID);
        } catch (e) {
            return res.json({ step: 'location_resolution', error: e.message });
        }
        
        // Test DB update
        try {
            await db.execute(
                `UPDATE users SET mac_address = ?, last_router_id = ?, location = ?, ip_address = ?, updated_at = NOW() WHERE id = ?`,
                [currentMAC, currentRouterID, currentLocation, req.ip, user.id]
            );
        } catch (e) {
            return res.json({ step: 'db_update', error: e.message });
        }
        
        // Test session regeneration
        try {
            await Promise.race([
                new Promise((resolve, reject) => {
                    req.session.regenerate((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Session regeneration timeout')), 5000))
            ]);
        } catch (e) {
            return res.json({ step: 'session_regenerate', error: e.message });
        }
        
        res.json({
            step: 'success',
            name: user.name,
            phone: user.phone_number,
            mac: currentMAC,
            router: currentRouterID,
            location: currentLocation,
            message: 'Login would succeed'
        });
    } catch (err) {
        res.status(500).json({ step: 'error', error: err.message, stack: err.stack });
    }
}

async function resolveRegisteredRouter(routerID) {
    if (!routerID) return null;
    try {
        const [rows] = await db.execute(
            'SELECT router_id FROM mikrotiks WHERE router_id = ? AND is_active = 1',
            [routerID]
        );
        return rows.length > 0 ? rows[0].router_id : null;
    } catch (_) {
        return null;
    }
}

async function getRealLocation(routerID) {
    if (!routerID) return 'Tanzania';
    try {
        const [routers] = await db.execute(
            `SELECT COALESCE(l.name, m.router_name, 'Tanzania') AS location
             FROM mikrotiks m
             LEFT JOIN locations l ON m.location_id = l.id
             WHERE m.router_id = ?`,
            [routerID]
        );
        if (routers.length > 0) {
            return routers[0].location;
        }
        return 'Tanzania';
    } catch (error) {
        return 'Tanzania';
    }
}

module.exports = debugFullLogin;
