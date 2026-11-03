const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function resetAndVerifyStanslaus() {
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
            return;
        }
        
        console.log(`✅ Found user: ${users[0].name} (id=${users[0].id})`);
        console.log(`   Old password hash: ${users[0].password ? users[0].password.substring(0, 30) + '...' : 'NULL/EMPTY'}`);
        
        // Hash new password
        const hashed = await bcrypt.hash(newPassword, 12);
        console.log(`   New password hash: ${hashed.substring(0, 30)}...`);
        
        // Update password
        const [result] = await db.execute(
            'UPDATE users SET password = ?, updated_at = NOW() WHERE phone_number = ?',
            [hashed, phone]
        );
        console.log(`   Updated rows: ${result.affectedRows}`);
        
        // Verify by re-reading from DB
        const [verify] = await db.execute(
            'SELECT password FROM users WHERE phone_number = ?',
            [phone]
        );
        const match = await bcrypt.compare(newPassword, verify[0].password);
        console.log(`   Verification: password '${newPassword}' matches = ${match}`);
        
        if (!match) {
            console.log('❌ Password verification FAILED! Trying different approach...');
            // Try comparing with the hash we just generated
            const match2 = await bcrypt.compare(newPassword, hashed);
            console.log(`   Direct hash comparison: ${match2}`);
        }
        
    } catch (err) {
        console.error('❌ Reset failed:', err.message, err.stack);
    }
}

module.exports = resetAndVerifyStanslaus;
