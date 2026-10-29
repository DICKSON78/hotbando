const db = require('../config/database');
const bcrypt = require('bcryptjs');

class PartnerController {
  async register(req, res) {
    try {
      const { name, email, phone, type, password } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Name is required' });
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email' });
      }
      if (!phone || !/^[0-9]{9,15}$/.test(phone.replace(/\+/g, ''))) {
        return res.status(400).json({ success: false, message: 'Invalid phone number' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }

      const cleanPhone = phone.startsWith('+') ? phone : (phone.startsWith('255') ? '+' + phone : '+255' + phone.replace(/^0+/, ''));
      const [existing] = await db.execute(
        'SELECT id FROM users WHERE email = ? OR phone_number = ?',
        [email, cleanPhone]
      );
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      let role = 'reseller';
      if (type === 'franchiser' || type === 'franchise') role = 'franchise_owner';
      else if (type === 'partner' || type === 'bank') role = 'bank_partner';
      else if (type === 'sponsor') role = 'sponsor';
      if (role === 'reseller') {
        return res.status(400).json({ success: false, message: 'Reseller applications are submitted at /apply/reseller and reviewed by HQ before an account is created.' });
      }

      const [result] = await db.execute(
        `INSERT INTO users (name, email, phone_number, password, role, is_active, is_verified, created_at)
         VALUES (?, ?, ?, ?, ?, 1, 0, NOW())`,
        [name, email, cleanPhone, hashedPassword, role]
      );

      const userId = result.insertId;

      if (role === 'reseller') {
        await db.execute('INSERT INTO resellers (user_id, status, created_at) VALUES (?, "active", NOW())', [userId]);
      } else if (role === 'bank_partner') {
        await db.execute('INSERT INTO bank_partners (user_id, status, created_at) VALUES (?, "pending", NOW())', [userId]).catch(() => {});
      } else if (role === 'sponsor') {
        await db.execute('INSERT INTO sponsors (user_id, status, created_at) VALUES (?, "pending", NOW())', [userId]).catch(() => {});
      }

      res.json({ success: true, message: 'Registration successful. Pending approval.' });
    } catch (e) {
      console.error('Partner registration error:', e);
      res.status(500).json({ success: false, message: 'Registration failed' });
    }
  }
}

module.exports = new PartnerController();
