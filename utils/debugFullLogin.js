const db = require('../config/database');
const bcrypt = require('bcryptjs');
const mikrotikService = require('../utils/mikrotik');

async function debugFullLogin(req, res) {
    try {
        const { phone_number, password } = req.body;
        
        // Step 1: Validate
        if (!phone_number || !/^[0-9]{9,15}$/.test(phone_number)) {
            return res.status(400).json({ step: 'validation', error: 'Namba ya simu sio sahihi.', phone_number });
        }
        if (!password || password.length < 4) {
            return res.status(400).json({ step: 'validation', error: 'Neno la siri linahitajika.' });
        }
        
        // Step 2: Query user
        const [users] = await db.execute(
            'SELECT * FROM users WHERE phone_number = ? AND role = "customer" AND is_active = 1',
            [phone_number]
        );
        
        if (users.length === 0) {
            return res.status(400).json({ step: 'user_lookup', error: 'Neno la siri au namba ya simu si sahihi.' });
        }
        
        const user = users[0];
        
        // Step 3: Password check
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ step: 'password_check', error: 'Neno la siri au namba ya simu si sahihi.' });
        }
        
        // Step 4: MAC resolution
        let currentMAC = null;
        let currentRouterID = null;
        
        try {
            const explicitRouter = req.body.router_id || req.query.routerID || req.query.routerid || req.query.router_id || req.headers['x-router-id'] || null;
            currentRouterID = await resolveRegisteredRouter(explicitRouter);
            if (!currentRouterID) {
                currentRouterID = await resolveRegisteredRouter(req.session.routerID);
            }
            if (!currentRouterID) {
                currentRouterID = await resolveRegisteredRouter(user.last_router_id);
            }
        } catch (e) {
            return res.status(500).json({ step: 'router_resolution', error: e.message });
        }
        
        // Step 5: MAC resolution from router
        if (!currentMAC && currentRouterID) {
            try {
                currentMAC = await mikrotikService.resolveClientMAC(currentRouterID, req.ip);
            } catch (e) {
                // Non-fatal, continue
            }
        }
        
        if (!currentMAC) {
            currentMAC = user.mac_address ? user.mac_address : null;
        }
        
        // Step 6: DB update
        try {
            await db.execute(
                `UPDATE users SET mac_address = ?, last_router_id = ?, updated_at = NOW() WHERE id = ?`,
                [currentMAC, currentRouterID, user.id]
            );
        } catch (e) {
            return res.status(500).json({ step: 'db_update', error: e.message });
        }
        
        // Step 7: Session regeneration
        try {
            await new Promise((resolve, reject) => {
                req.session.regenerate((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (e) {
            return res.status(500).json({ step: 'session_regenerate', error: e.message });
        }
        
        res.json({ step: 'success', name: user.name, message: 'Login successful' });
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

module.exports = debugFullLogin;
