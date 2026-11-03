const db = require('../config/database');

async function checkLogs(req, res) {
    try {
        // Check recent login attempts
        const [logs] = await db.execute(
            'SELECT * FROM user_connection_logs WHERE mac_address = "56:77:D3:C7:67:AD" ORDER BY timestamp DESC LIMIT 10'
        );
        
        // Check user details
        const [users] = await db.execute(
            'SELECT id, name, phone_number, password, role, is_active, mac_address, package, usage_until, free_bytes, last_router_id FROM users WHERE phone_number = "0776126464"'
        );
        
        // Check if user exists with different phone format
        const [users2] = await db.execute(
            'SELECT id, name, phone_number, is_active FROM users WHERE phone_number LIKE "%776126464%"'
        );
        
        res.json({
            connection_logs: logs,
            user: users.length > 0 ? users[0] : null,
            partial_matches: users2
        });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
}

module.exports = checkLogs;
