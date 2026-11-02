const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function debugStanslaus() {
    try {
        const phone = '0776126464';
        console.log(`🔍 Debugging user ${phone}...`);
        
        const [users] = await db.execute(
            'SELECT id, name, phone_number, mac_address, password, role, is_active FROM users WHERE phone_number = ?',
            [phone]
        );
        
        if (users.length === 0) {
            console.log(`⚠️ No user found with phone ${phone}`);
            // Try without leading zero
            const [users2] = await db.execute(
                'SELECT id, name, phone_number, mac_address FROM users WHERE phone_number LIKE ?',
                ['%776126464%']
            );
            console.log(`   Found ${users2.length} users matching %776126464%`);
            for (const u of users2) {
                console.log(`   - id=${u.id}, name=${u.name}, phone=${u.phone_number}, mac=${u.mac_address}`);
            }
            return;
        }
        
        const user = users[0];
        console.log(`   id=${user.id}, name=${user.name}, phone=${user.phone_number}`);
        console.log(`   mac=${user.mac_address}, role=${user.role}, active=${user.is_active}`);
        console.log(`   password hash: ${user.password ? user.password.substring(0, 30) + '...' : 'NULL'}`);
        
        // Test password
        const testPass = 'password123';
        const match = await bcrypt.compare(testPass, user.password);
        console.log(`   password 'password123' matches: ${match}`);
        
        // Reset password
        const hashed = await bcrypt.hash(testPass, 12);
        await db.execute(
            'UPDATE users SET password = ?, updated_at = NOW() WHERE phone_number = ?',
            [hashed, phone]
        );
        console.log(`   Password reset to 'password123'`);
        
        // Verify
        const [verify] = await db.execute(
            'SELECT password FROM users WHERE phone_number = ?',
            [phone]
        );
        const verifyMatch = await bcrypt.compare(testPass, verify[0].password);
        console.log(`   Verification: password matches = ${verifyMatch}`);
        
    } catch (err) {
        console.error('❌ Debug failed:', err.message, err.stack);
    }
}

module.exports = debugStanslaus;
