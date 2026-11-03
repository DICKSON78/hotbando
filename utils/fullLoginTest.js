const db = require('../config/database');
const bcrypt = require('bcryptjs');

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
        
        // Skip MAC resolution and router resolution (they might hang)
        // Just test DB update and session regeneration
        try {
            await db.execute(
                'UPDATE users SET mac_address = ?, last_router_id = ?, updated_at = NOW() WHERE id = ?',
                [user.mac_address, user.last_router_id, user.id]
            );
        } catch (e) {
            return res.json({ step: 'db_update', error: e.message });
        }
        
        // Test session regeneration with timeout
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
            mac: user.mac_address,
            router: user.last_router_id,
            message: 'Login would succeed'
        });
    } catch (err) {
        res.status(500).json({ step: 'error', error: err.message, stack: err.stack });
    }
}

module.exports = fullLoginTest;
