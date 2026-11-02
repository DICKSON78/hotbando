const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function resetStanslausPassword() {
    try {
        const phone = '0776126464';
        const newPassword = 'password123';
        const hashed = await bcrypt.hash(newPassword, 12);
        console.log(`🔐 Resetting password for ${phone}...`);
        console.log(`   Hash: ${hashed.substring(0, 20)}...`);
        
        const [users] = await db.execute(
            'SELECT id, name, phone_number FROM users WHERE phone_number = ?',
            [phone]
        );
        
        if (users.length === 0) {
            console.log(`⚠️ No user found with phone ${phone}`);
            return;
        }
        
        console.log(`   Found user: ${users[0].name} (id=${users[0].id})`);
        
        const [result] = await db.execute(
            'UPDATE users SET password = ?, updated_at = NOW() WHERE phone_number = ? AND role = "customer"',
            [hashed, phone]
        );
        
        console.log(`   Updated rows: ${result.affectedRows}`);
        
        // Verify
        const [verify] = await db.execute(
            'SELECT password FROM users WHERE phone_number = ?',
            [phone]
        );
        const match = await bcrypt.compare(newPassword, verify[0].password);
        console.log(`   Verification: password matches = ${match}`);
        
    } catch (err) {
        console.error('❌ Password reset failed:', err.message, err.stack);
    }
}

module.exports = resetStanslausPassword;
