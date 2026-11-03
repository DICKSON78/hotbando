const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function testLogin(req, res) {
    try {
        const phone = '0776126464';
        const password = '123456';
        
        const [users] = await db.execute(
            'SELECT * FROM users WHERE phone_number = ? AND role = "customer" AND is_active = 1',
            [phone]
        );
        
        if (users.length === 0) {
            return res.json({ step: 'user_lookup', result: 'not_found', phone });
        }
        
        const user = users[0];
        
        let passwordMatch = false;
        let error = null;
        try {
            passwordMatch = await bcrypt.compare(password, user.password);
        } catch (e) {
            error = e.message;
        }
        
        res.json({
            step: 'password_check',
            phone: user.phone_number,
            password_hash: user.password.substring(0, 20) + '...',
            password_match: passwordMatch,
            error: error
        });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
}

module.exports = testLogin;
