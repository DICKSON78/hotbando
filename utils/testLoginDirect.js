const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function testLoginDirect(req, res) {
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
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.json({ step: 'password_check', result: 'invalid', phone, password });
        }
        
        res.json({ step: 'success', name: user.name, phone: user.phone_number, message: 'Credentials are correct' });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
}

module.exports = testLoginDirect;
