const db = require('../config/database');
const bcrypt = require('bcryptjs');
const mikrotikService = require('../utils/mikrotik');

async function debugLogin(req, res) {
    try {
        const { phone_number, password } = req.body;
        
        console.log('🔍 DEBUG Login attempt:', { phone_number, password: password ? '***' : null, mac: req.session.mac, router: req.session.routerID, ip: req.ip });
        
        if (!phone_number || !/^[0-9]{9,15}$/.test(phone_number)) {
            console.log('❌ Invalid phone format:', phone_number);
            return res.status(400).json({ step: 'validation', error: 'Namba ya simu sio sahihi.', phone_number });
        }
        
        if (!password || password.length < 4) {
            console.log('❌ Password too short');
            return res.status(400).json({ step: 'validation', error: 'Neno la siri linahitajika.' });
        }
        
        const [users] = await db.execute(
            'SELECT * FROM users WHERE phone_number = ? AND role = "customer" AND is_active = 1',
            [phone_number]
        );
        
        if (users.length === 0) {
            console.log('❌ User not found:', phone_number);
            return res.status(400).json({ step: 'user_lookup', error: 'Neno la siri au namba ya simu si sahihi.', phone_number });
        }
        
        const user = users[0];
        console.log('✅ User found:', user.name, user.id);
        
        let isPasswordValid = false;
        try {
            isPasswordValid = await bcrypt.compare(password, user.password);
        } catch (e) {
            console.log('❌ bcrypt.compare error:', e.message);
            return res.status(500).json({ step: 'password_check', error: 'bcrypt error: ' + e.message });
        }
        
        if (!isPasswordValid) {
            console.log('❌ Password invalid for user:', user.name);
            return res.status(400).json({ step: 'password_check', error: 'Neno la siri au namba ya simu si sahihi.' });
        }
        
        console.log('✅ Password valid for user:', user.name);
        
        // Try MAC binding
        let currentMAC = null;
        let currentRouterID = null;
        
        try {
            currentRouterID = await resolveRegisteredRouter(req.session.routerID);
            if (!currentRouterID) {
                currentRouterID = await resolveRegisteredRouter(user.last_router_id);
            }
        } catch (e) {
            console.log('❌ Router resolution error:', e.message);
            return res.status(500).json({ step: 'router_resolution', error: e.message });
        }
        
        console.log('✅ Router resolved:', currentRouterID);
        
        // Try DB update
        try {
            await db.execute(
                `UPDATE users SET mac_address = ?, last_router_id = ?, updated_at = NOW() WHERE id = ?`,
                [user.mac_address, currentRouterID, user.id]
            );
        } catch (e) {
            console.log('❌ DB update error:', e.message);
            return res.status(500).json({ step: 'db_update', error: e.message });
        }
        
        console.log('✅ DB updated successfully');
        
        res.json({ step: 'success', name: user.name, message: 'Login successful' });
    } catch (err) {
        console.error('❌ Login error:', err.message, err.stack);
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

module.exports = debugLogin;
