const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function debugRegister(req, res) {
    try {
        const { name, phone_number, password } = req.body;
        
        if (!name || !phone_number || !password) {
            return res.json({ step: 'validation', error: 'Missing fields', name, phone_number, password: !!password });
        }
        
        // Check if phone exists
        const [existing] = await db.execute(
            'SELECT id FROM users WHERE phone_number = ? AND role = "customer"',
            [phone_number]
        );
        
        if (existing.length > 0) {
            return res.json({ step: 'duplicate', error: 'Phone already registered', id: existing[0].id });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Get settings
        const [settings] = await db.execute(
            `SELECT setting_key, setting_value FROM system_settings
             WHERE setting_key IN ('default_free_data_mb', 'free_data_per_user')`
        );
        const settingMap = Object.fromEntries(settings.map(s => [s.setting_key, s.setting_value]));
        const freeBytes = settingMap.free_data_per_user
            ? parseInt(settingMap.free_data_per_user, 10)
            : (settingMap.default_free_data_mb ? parseInt(settingMap.default_free_data_mb, 10) * 1024 * 1024 : 10485760);
        
        const now = new Date();
        const [result] = await db.execute(
            `INSERT INTO users 
            (name, phone_number, password, role, package, mac_address, location, last_router_id, ip_address, moneyspent, usage_start, usage_until, free_bytes, last_free_used, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, "customer", "KARIBU HOT BANDO", NULL, NULL, NULL, NULL, 0, ?, ?, ?, NULL, 1, ?, ?)`,
            [name, phone_number, hashedPassword, now, now, freeBytes, now, now]
        );
        
        res.json({ step: 'success', id: result.insertId, freeBytes });
    } catch (err) {
        res.status(500).json({ step: 'error', error: err.message, stack: err.stack });
    }
}

module.exports = debugRegister;
