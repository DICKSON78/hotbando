const db = require('../config/database');
const bcrypt = require('bcryptjs');

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
        
        // Step 4: Router resolution (with timeout)
        let currentRouterID = null;
        try {
            const explicitRouter = req.body.router_id || req.query.routerID || req.query.routerid || req.query.router_id || req.headers['x-router-id'] || null;
            if (explicitRouter) {
                const [rows] = await db.execute(
                    'SELECT router_id FROM mikrotiks WHERE router_id = ? AND is_active = 1',
                    [explicitRouter]
                );
                if (rows.length > 0) currentRouterID = rows[0].router_id;
            }
            if (!currentRouterID && user.last_router_id) {
                const [rows] = await db.execute(
                    'SELECT router_id FROM mikrotiks WHERE router_id = ? AND is_active = 1',
                    [user.last_router_id]
                );
                if (rows.length > 0) currentRouterID = rows[0].router_id;
            }
        } catch (e) {
            return res.status(500).json({ step: 'router_resolution', error: e.message });
        }
        
        // Step 5: Skip MAC resolution (might hang)
        let currentMAC = user.mac_address || null;
        
        // Step 6: DB update
        try {
            await db.execute(
                `UPDATE users SET mac_address = ?, last_router_id = ?, updated_at = NOW() WHERE id = ?`,
                [currentMAC, currentRouterID, user.id]
            );
        } catch (e) {
            return res.status(500).json({ step: 'db_update', error: e.message });
        }
        
        // Step 7: Session regeneration (with timeout)
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
            return res.status(500).json({ step: 'session_regenerate', error: e.message });
        }
        
        res.json({ step: 'success', name: user.name, phone: user.phone_number, mac: currentMAC, router: currentRouterID, message: 'Login would succeed' });
    } catch (err) {
        res.status(500).json({ step: 'error', error: err.message, stack: err.stack });
    }
}

module.exports = debugFullLogin;
