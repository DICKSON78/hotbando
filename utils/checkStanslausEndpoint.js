const db = require('../config/database');

async function checkStanslaus(req, res) {
    try {
        const [users] = await db.execute(
            'SELECT id, name, phone_number, password, role, is_active, mac_address, package, usage_until, free_bytes FROM users WHERE phone_number = ?',
            ['0776126464']
        );
        
        if (users.length === 0) {
            // Try partial match
            const [users2] = await db.execute(
                'SELECT id, name, phone_number, is_active, mac_address FROM users WHERE phone_number LIKE ?',
                ['%776126464%']
            );
            return res.json({ found: false, partial: users2 });
        }
        
        const user = users[0];
        res.json({
            found: true,
            id: user.id,
            name: user.name,
            phone: user.phone_number,
            role: user.role,
            is_active: user.is_active,
            mac: user.mac_address,
            package: user.package,
            usage_until: user.usage_until,
            free_bytes: user.free_bytes,
            password_hash: user.password ? user.password.substring(0, 30) + '...' : 'NULL/EMPTY',
            password_length: user.password ? user.password.length : 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = checkStanslaus;
