const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function simpleLogin(req, res) {
    try {
        const { phone_number, password } = req.body;
        
        if (!phone_number || !password) {
            return res.status(400).json({ error: 'Phone and password required' });
        }
        
        const [users] = await db.execute(
            'SELECT id, name, phone_number, password, is_active FROM users WHERE phone_number = ?',
            [phone_number]
        );
        
        if (users.length === 0) {
            return res.status(400).json({ error: 'User not found with phone: ' + phone_number });
        }
        
        const user = users[0];
        
        if (user.is_active !== 1) {
            return res.status(400).json({ error: 'Account inactive' });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Wrong password' });
        }
        
        res.json({ success: true, message: 'Login successful', name: user.name });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
}

module.exports = simpleLogin;
