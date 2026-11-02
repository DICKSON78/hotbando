const db = require('../config/database');
const bcrypt = require('bcrypt');

async function resetStanslausPassword() {
    try {
        const phone = '0776126464';
        const newPassword = 'password123';
        const hashed = await bcrypt.hash(newPassword, 12);
        const [result] = await db.execute(
            'UPDATE users SET password = ?, updated_at = NOW() WHERE phone_number = ? AND role = "customer"',
            [hashed, phone]
        );
        if (result.affectedRows > 0) {
            console.log(`✅ Reset password for ${phone} to: ${newPassword}`);
        } else {
            console.log(`⚠️ No user found with phone ${phone}`);
        }
    } catch (err) {
        console.error('❌ Password reset failed:', err.message);
    }
}

module.exports = resetStanslausPassword;
