const db = require('../config/database');
const bcrypt = require('bcryptjs');

const PACKAGE_VALUES = {
  'MASAA 6': { id: 1, price: 500 },
  'MASAA 24': { id: 2, price: 1000 },
  'WIKI 1': { id: 3, price: 6000 },
  'MWEZI 1': { id: 4, price: 20000 },
};

class ResellerController {

  async register(req, res) {
    try {
      const { name, email, phone, password, location } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Jina linahitajika' });
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Barua pepe sio sahihi' });
      }
      if (!phone || !/^[0-9]{9,15}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Namba ya simu sio sahihi' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Neno la siri linahitajika (angalau herufi 6)' });
      }

      const [existingUsers] = await db.execute(
        'SELECT id FROM users WHERE (email = ? OR phone_number = ?) AND role = "reseller"',
        [email, phone]
      );
      if (existingUsers.length > 0) {
        return res.status(400).json({ success: false, message: 'Barua pepe au namba ya simu tayari imesajiliwa kama reseller' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const [userResult] = await db.execute(
        `INSERT INTO users (name, phone_number, email, password, role, is_active, is_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'reseller', 1, 0, NOW(), NOW())`,
        [name.trim(), phone, email, hashedPassword]
      );

      const userId = userResult.insertId;

      await db.execute(
        `INSERT INTO resellers (user_id, balance, total_earned, status, created_at)
         VALUES (?, 0, 0, 'active', NOW())`,
        [userId]
      );

      const [resellerRows] = await db.execute('SELECT * FROM resellers WHERE user_id = ?', [userId]);
      const reseller = resellerRows[0];

      req.session.reseller_user = {
        id: userId,
        name: name.trim(),
        email,
        phone_number: phone,
        role: 'reseller',
        reseller_id: reseller.id,
        location: location || null,
        login_time: new Date()
      };

      return res.json({
        success: true,
        message: 'Usajili umefanikiwa',
        data: {
          id: userId,
          name: name.trim(),
          email,
          phone_number: phone,
          reseller_id: reseller.id
        }
      });
    } catch (error) {
      console.error('Hitilafu katika usajili wa reseller:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kusajili reseller', error: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Barua pepe na neno la siri vinahitajika' });
      }

      const [users] = await db.execute(
        'SELECT * FROM users WHERE email = ? AND role = "reseller" AND is_active = 1',
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({ success: false, message: 'Barua pepe au neno la siri sio sahihi' });
      }

      const user = users[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Barua pepe au neno la siri sio sahihi' });
      }

      const [resellerRows] = await db.execute(
        'SELECT * FROM resellers WHERE user_id = ? AND status = "active"',
        [user.id]
      );

      if (resellerRows.length === 0) {
        return res.status(403).json({ success: false, message: 'Akaunti yako ya reseller haipatikani au imesimamishwa' });
      }

      const reseller = resellerRows[0];

      req.session.reseller_user = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role: 'reseller',
        reseller_id: reseller.id,
        location: user.location,
        login_time: new Date()
      };

      return res.json({
        success: true,
        message: 'Umefanikiwa kuingia',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          reseller_id: reseller.id
        }
      });
    } catch (error) {
      console.error('Hitilafu katika kuingia kwa reseller:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kuingia', error: error.message });
    }
  }

  async getDashboard(req, res) {
    try {
      const resellerUserId = req.session.reseller_user.id;

      const [resellerRows] = await db.execute('SELECT * FROM resellers WHERE user_id = ?', [resellerUserId]);
      if (resellerRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Reseller haijapatikana' });
      }
      const reseller = resellerRows[0];

      const [totalVouchers] = await db.execute(
        `SELECT COUNT(*) as count FROM vouchers v
         JOIN voucher_batches vb ON v.batch_id = vb.id
         WHERE vb.created_by = ?`,
        [resellerUserId]
      );

      const [soldVouchers] = await db.execute(
        `SELECT COUNT(*) as count FROM vouchers v
         JOIN voucher_batches vb ON v.batch_id = vb.id
         WHERE vb.created_by = ? AND v.is_used = 1`,
        [resellerUserId]
      );

      const [earningsResult] = await db.execute(
        `SELECT COALESCE(SUM(v.price), 0) as total FROM vouchers v
         JOIN voucher_batches vb ON v.batch_id = vb.id
         WHERE vb.created_by = ? AND v.is_used = 1`,
        [resellerUserId]
      );

      const [recentSales] = await db.execute(
        `SELECT v.voucher_code, p.name as package_name, v.price, v.used_at,
                u.name as customer_name
         FROM vouchers v
         JOIN voucher_batches vb ON v.batch_id = vb.id
         JOIN packages p ON v.package_id = p.id
         LEFT JOIN users u ON v.used_by = u.id
         WHERE vb.created_by = ? AND v.is_used = 1
         ORDER BY v.used_at DESC
         LIMIT 10`,
        [resellerUserId]
      );

      return res.json({
        success: true,
        wallet: {
          balance: parseFloat(reseller.balance) || 0,
          total_earned: parseFloat(reseller.total_earned) || 0
        },
        summary: {
          total: totalVouchers[0].count || 0,
          redeemed: soldVouchers[0].count || 0,
          earnings: parseFloat(earningsResult[0].total) || 0
        },
        recent_sales: recentSales
      });
    } catch (error) {
      console.error('Hitilafu katika dashboard ya reseller:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupakua dashboard', error: error.message });
    }
  }

  async getVouchers(req, res) {
    try {
      const resellerUserId = req.session.reseller_user.id;
      const { status, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT v.id, v.voucher_code, p.name as package_name, v.price, v.is_used,
               v.used_at, v.expires_at, v.created_at,
               u.name as used_by_name, u.phone_number as used_by_phone
        FROM vouchers v
        JOIN voucher_batches vb ON v.batch_id = vb.id
        JOIN packages p ON v.package_id = p.id
        LEFT JOIN users u ON v.used_by = u.id
        WHERE vb.created_by = ?
      `;
      const params = [resellerUserId];

      if (status === 'unused') {
        query += ' AND v.is_used = 0 AND v.expires_at > NOW()';
      } else if (status === 'used') {
        query += ' AND v.is_used = 1';
      } else if (status === 'expired') {
        query += ' AND v.is_used = 0 AND v.expires_at <= NOW()';
      }

      query += ` ORDER BY v.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

      const [vouchers] = await db.execute(query, params);

      let countQuery = 'SELECT COUNT(*) as total FROM vouchers v JOIN voucher_batches vb ON v.batch_id = vb.id WHERE vb.created_by = ?';
      const countParams = [resellerUserId];
      if (status === 'unused') {
        countQuery += ' AND v.is_used = 0 AND v.expires_at > NOW()';
      } else if (status === 'used') {
        countQuery += ' AND v.is_used = 1';
      } else if (status === 'expired') {
        countQuery += ' AND v.is_used = 0 AND v.expires_at <= NOW()';
      }
      const [totalResult] = await db.execute(countQuery, countParams);

      return res.json({
        success: true,
        data: vouchers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult[0].total,
          pages: Math.ceil(totalResult[0].total / limit)
        }
      });
    } catch (error) {
      console.error('Hitilafu katika kupata vouchers za reseller:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata vouchers', error: error.message });
    }
  }

  async generateVouchers(req, res) {
    try {
      const resellerUserId = req.session.reseller_user.id;
      const { package_type, quantity } = req.body;

      if (!package_type || !PACKAGE_VALUES[package_type]) {
        return res.status(400).json({ success: false, message: 'Aina ya kifurushi sio sahihi. Chagua: MASAA 6, MASAA 24, WIKI 1, au MWEZI 1' });
      }

      const qty = parseInt(quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: 'Idadi ya vouchers lazima iwe nambari chanya' });
      }
      if (qty > 10000) {
        return res.status(400).json({ success: false, message: 'Idadi ya vouchers haizidi 10,000 kwa mara moja' });
      }

      const [resellerRows] = await db.execute('SELECT * FROM resellers WHERE user_id = ? AND status = "active"', [resellerUserId]);
      if (resellerRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Akaunti ya reseller haijapatikana' });
      }
      const reseller = resellerRows[0];

      const packageInfo = PACKAGE_VALUES[package_type];
      const totalCost = packageInfo.price * qty;

      if (parseFloat(reseller.balance) < totalCost) {
        return res.status(400).json({
          success: false,
          message: `Salio haikutosi. Unahitaji TZS ${totalCost.toLocaleString()}, una TZS ${parseFloat(reseller.balance).toLocaleString()}`
        });
      }

      const [batches] = await db.execute('SELECT MAX(id) as maxId FROM voucher_batches');
      const nextBatchNumber = (batches[0].maxId || 0) + 1;
      const batchName = `RSL-${new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase()}-${nextBatchNumber.toString().padStart(3, '0')}`;

      const [batchResult] = await db.execute(
        'INSERT INTO voucher_batches (batch_name, issued_to, total_vouchers, total_value, created_by) VALUES (?, ?, ?, ?, ?)',
        [batchName, `Reseller: ${req.session.reseller_user.name}`, qty, totalCost, resellerUserId]
      );
      const batchId = batchResult.insertId;

      const allVouchers = [];
      for (let i = 0; i < qty; i++) {
        const code = await this.generateUniqueVoucher();
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        allVouchers.push([code, packageInfo.id, packageInfo.price, 0, null, null, batchId, expiresAt]);
      }

      const placeholders = allVouchers.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(',');
      const values = allVouchers.flat();
      await db.execute(
        `INSERT INTO vouchers (voucher_code, package_id, price, is_used, used_at, used_by, batch_id, expires_at) VALUES ${placeholders}`,
        values
      );

      await db.execute(
        'UPDATE voucher_batches SET total_vouchers = ?, total_value = ? WHERE id = ?',
        [qty, totalCost, batchId]
      );

      await db.execute(
        'UPDATE resellers SET balance = balance - ? WHERE user_id = ?',
        [totalCost, resellerUserId]
      );

      return res.json({
        success: true,
        message: `Vouchers ${qty} za ${package_type} zimeundwa kikamilifu!`,
        data: {
          batch_id: batchId,
          batch_name: batchName,
          count: qty,
          package_type,
          cost: totalCost,
          balance_after: parseFloat(reseller.balance) - totalCost
        }
      });
    } catch (error) {
      console.error('Hitilafu katika kuunda vouchers za reseller:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kuunda vouchers', error: error.message });
    }
  }

  async topUp(req, res) {
    try {
      const resellerUserId = req.session.reseller_user.id;
      const { amount, payment_method, payment_reference } = req.body;

      const topUpAmount = parseFloat(amount);
      if (isNaN(topUpAmount) || topUpAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Kiasi lazima iwe nambari chanya' });
      }
      if (topUpAmount < 1000) {
        return res.status(400).json({ success: false, message: 'Kiasi kidogo ni TZS 1,000' });
      }

      const [resellerRows] = await db.execute('SELECT * FROM resellers WHERE user_id = ? AND status = "active"', [resellerUserId]);
      if (resellerRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Akaunti ya reseller haijapatikana' });
      }

      await db.execute(
        'UPDATE resellers SET balance = balance + ? WHERE user_id = ?',
        [topUpAmount, resellerUserId]
      );

      const [updatedReseller] = await db.execute('SELECT balance FROM resellers WHERE user_id = ?', [resellerUserId]);

      return res.json({
        success: true,
        message: `Salio limeongezwa kwa TZS ${topUpAmount.toLocaleString()}`,
        data: {
          amount_added: topUpAmount,
          balance_after: parseFloat(updatedReseller[0].balance),
          payment_method: payment_method || 'manual',
          payment_reference: payment_reference || null
        }
      });
    } catch (error) {
      console.error('Hitilafu katika kuongeza salio:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kuongeza salio', error: error.message });
    }
  }

  async getWithdrawals(req, res) {
    try {
      const resellerUserId = req.session.reseller_user.id;

      const [resellerRows] = await db.execute('SELECT id FROM resellers WHERE user_id = ?', [resellerUserId]);
      if (resellerRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Reseller haijapatikana' });
      }

      const [withdrawals] = await db.execute(
        `SELECT * FROM reseller_withdrawals WHERE reseller_id = ? ORDER BY created_at DESC`,
        [resellerRows[0].id]
      );

      return res.json({ success: true, data: withdrawals, count: withdrawals.length });
    } catch (error) {
      console.error('Hitilafu katika kupata uondoaji wa pesa:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata historia ya uondoaji', error: error.message });
    }
  }

  async requestWithdrawal(req, res) {
    try {
      const resellerUserId = req.session.reseller_user.id;
      const { amount, payment_method, payment_phone } = req.body;

      const withdrawAmount = parseFloat(amount);
      if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Kiasi lazima iwe nambari chanya' });
      }
      if (withdrawAmount < 5000) {
        return res.status(400).json({ success: false, message: 'Kiasi kidogo cha uondoaji ni TZS 5,000' });
      }

      const [resellerRows] = await db.execute('SELECT * FROM resellers WHERE user_id = ? AND status = "active"', [resellerUserId]);
      if (resellerRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Akaunti ya reseller haijapatikana' });
      }
      const reseller = resellerRows[0];

      if (parseFloat(reseller.balance) < withdrawAmount) {
        return res.status(400).json({
          success: false,
          message: `Salio haikutosi. Una TZS ${parseFloat(reseller.balance).toLocaleString()}`
        });
      }

      await db.execute(
        `INSERT INTO reseller_withdrawals (reseller_id, user_id, amount, payment_method, payment_phone, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
         [reseller.id, resellerUserId, withdrawAmount, payment_method || null, payment_phone || null]
      );

      await db.execute(
        'UPDATE resellers SET balance = balance - ? WHERE user_id = ?',
        [withdrawAmount, resellerUserId]
      );

      const [updatedReseller] = await db.execute('SELECT balance FROM resellers WHERE user_id = ?', [resellerUserId]);

      return res.json({
        success: true,
        message: `Ombi la uondoaji wa TZS ${withdrawAmount.toLocaleString()} limewasilishwa`,
        data: {
          amount: withdrawAmount,
          balance_after: parseFloat(updatedReseller[0].balance),
          status: 'pending'
        }
      });
    } catch (error) {
      console.error('Hitilafu katika kuomba uondoaji:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kuomba uondoaji', error: error.message });
    }
  }

  async generateUniqueVoucher() {
    let code;
    let exists = true;
    let attempts = 0;
    while (exists && attempts < 10) {
      code = 'HOT' + Math.floor(100000 + Math.random() * 900000).toString();
      const [vouchers] = await db.execute('SELECT id FROM vouchers WHERE voucher_code = ?', [code]);
      exists = vouchers.length > 0;
      attempts++;
    }
    if (exists) {
      code = 'HOT' + Date.now().toString().slice(-8);
    }
    return code;
  }
}

module.exports = new ResellerController();
