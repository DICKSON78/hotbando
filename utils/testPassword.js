const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function testPassword(req, res) {
    try {
        const phone = '0776126464';
        const testPasswords = ['123456', 'password123', 'admin123', 'Stanslaus123'];
        
        const [users] = await db.execute(
            'SELECT id, name, phone_number, password FROM users WHERE phone_number = ?',
            [phone]
        );
        
        if (users.length === 0) {
            return res.json({ error: 'User not found' });
        }
        
        const user = users[0];
        const results = [];
        
        for (const pwd of testPasswords) {
            const match = await bcrypt.compare(pwd, user.password);
            results.push({ password: pwd, match });
        }
        
        res.json({
            phone: user.phone_number,
            name: user.name,
            password_hash: user.password.substring(0, 30) + '...',
            test_results: results
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = testPassword;
