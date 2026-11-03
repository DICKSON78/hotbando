const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function resetStanslausPassword() {
    try {
        const phone = '0776126464';
        const newPassword = '123456';
        
        // Check if user exists
        const [users] = await db.execute(
            'SELECT id, name, phone_number, password FROM users WHERE phone_number = ?',
            [phone]
        );
        
        if (users.length === 0) {
            console.log(`⚠️ No user found with phone ${phone}`);
            // Try partial match
            const [users2] = await db.execute(
                'SELECT id, name, phone_number FROM users WHERE phone_number LIKE ?',
                ['%776126464%']
            );
            console.log(`   Found ${users2.length} users matching %776126464%`);
            for (const u of users2) {
                console.log(`   - id=${u.id}, name=${u.name}, phone=${u.phone_number}`);
            }
            return;
        }
        
        console.log(`✅ Found user: ${users[0].name} (id=${users[0].id}, phone=${users[0].phone_number})`);
        console.log(`   Old password hash: ${users[0].password ? users[0].password.substring(0, 20) + '...' : 'NULL'}`);
        
        const hashed = await bcrypt.hash(newPassword, 12);
        console.log(`   New password hash: ${hashed.substring(0, 20)}...`);
        
        const [result] = await db.execute(
            'UPDATE users SET password = ?, updated_at = NOW() WHERE phone_number = ?',
            [hashed, phone]
        );
        console.log(`   Updated rows: ${result.affectedRows}`);
        
        // Verify
        const [verify] = await db.execute(
            'SELECT password FROM users WHERE phone_number = ?',
            [phone]
        );
        const match = await bcrypt.compare(newPassword, verify[0].password);
        console.log(`   Verification: password '${newPassword}' matches = ${match}`);
        
    } catch (err) {
        console.error('❌ Password reset failed:', err.message, err.stack);
    }
}

module.exports = resetStanslausPassword;
