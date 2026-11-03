const db = require('../config/database');
const bcrypt = require('bcryptjs');
const mikrotikService = require('../utils/mikrotik');

async function fullLoginTest(req, res) {
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
        
        // Test MAC resolution
        let currentMAC = null;
        let currentRouterID = null;
        
        try {
            // Resolve router
            const explicitRouter = null;
            currentRouterID = await resolveRegisteredRouter(explicitRouter);
            if (!currentRouterID) {
                currentRouterID = await resolveRegisteredRouter(user.last_router_id);
            }
        } catch (e) {
            return res.json({ step: 'router_resolution', error: e.message });
        }
        
        if (!currentMAC && currentRouterID) {
            try {
                currentMAC = await mikrotikService.resolveClientMAC(currentRouterID, req.ip);
            } catch (e) {
                return res.json({ step: 'mac_resolution', error: e.message, routerID: currentRouterID });
            }
        }
        
        res.json({
            step: 'success',
            name: user.name,
            phone: user.phone_number,
            mac: currentMAC || user.mac_address,
            router: currentRouterID,
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

module.exports = fullLoginTest;
