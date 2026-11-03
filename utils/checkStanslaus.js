const db = require('../config/database');

async function checkStanslaus() {
    try {
        console.log('🔍 Checking Stanslaus credentials...');
        
        // Try exact match
        const [users] = await db.execute(
            'SELECT id, name, phone_number, password, role, is_active, mac_address, package, usage_until, free_bytes FROM users WHERE phone_number = ?',
            ['0776126464']
        );
        
        if (users.length === 0) {
            console.log('⚠️ No user found with phone 0776126464');
            // Try partial match
            const [users2] = await db.execute(
                'SELECT id, name, phone_number, is_active, mac_address FROM users WHERE phone_number LIKE ?',
                ['%776126464%']
            );
            console.log(`   Found ${users2.length} users matching %776126464%`);
            for (const u of users2) {
                console.log(`   - id=${u.id}, name=${u.name}, phone=${u.phone_number}, active=${u.is_active}, mac=${u.mac_address}`);
            }
            return;
        }
        
        const user = users[0];
        console.log(`✅ User found:`);
        console.log(`   id=${user.id}, name=${user.name}`);
        console.log(`   phone=${user.phone_number}, role=${user.role}, active=${user.is_active}`);
        console.log(`   mac=${user.mac_address}, package=${user.package}`);
        console.log(`   usage_until=${user.usage_until}, free_bytes=${user.free_bytes}`);
        console.log(`   password hash: ${user.password ? user.password.substring(0, 30) + '...' : 'NULL/EMPTY'}`);
        console.log(`   password length: ${user.password ? user.password.length : 0}`);
        
    } catch (err) {
        console.error('❌ Check failed:', err.message, err.stack);
    }
}

module.exports = checkStanslaus;
