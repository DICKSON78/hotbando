// routes/admin.js - ORGANIZED & CLEANED
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { csrfProtection } = require('../middleware/security'); // CSRF protection for state-changing requests
const { adminAuth } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// DEBUG: Log all admin requests
router.use((req, res, next) => {
    logger.info('ADMIN ROUTE HIT', { method: req.method, path: req.path, query: req.query, session: !!req.session.admin_user });
    next();
});

// ==================== PROTECTED ROUTES (WITH AUTH) ====================
router.use(adminAuth);

// ==================== HQ MANAGEMENT API ====================
const hqRoutes = require('./hq');
router.use('/hq', hqRoutes);

// ==================== LOCATION & ROUTER PROXY API ====================
router.use('/locations', require('./locationRoutes'));

// ==================== ADMIN WALLET API ====================
router.get('/wallet', async (req, res) => {
  try {
    const db = require('../config/database');
    const user = req.session.admin_user;
    const [wallets] = await db.execute(
      'SELECT * FROM wallets WHERE user_id = ? LIMIT 1', [user.id]
    );
    if (wallets.length === 0) {
      await db.execute(
        'INSERT INTO wallets (user_id, balance, is_active, created_at) VALUES (?, 0, 1, NOW())', [user.id]
      );
      const [newWallet] = await db.execute('SELECT * FROM wallets WHERE user_id = ?', [user.id]);
      return res.json({ success: true, wallet: newWallet[0] || { balance: 0, is_active: 1 } });
    }
    res.json({ success: true, wallet: wallets[0] });
  } catch (error) {
    console.error('Admin wallet error:', error.message);
    res.status(500).json({ error: 'Failed to load wallet' });
  }
});

router.get('/wallet/transactions', async (req, res) => {
  try {
    const db = require('../config/database');
    const user = req.session.admin_user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const [transactions] = await db.execute(
      `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, [user.id]
    );
    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?', [user.id]
    );
    res.json({
      success: true,
      transactions,
      pagination: { page, limit, total: countResult[0].total, pages: Math.ceil(countResult[0].total / limit) }
    });
  } catch (error) {
    console.error('Admin wallet transactions error:', error.message);
    res.status(500).json({ error: 'Failed to load transactions' });
  }
});

router.post('/wallet/deposit', async (req, res) => {
  try {
    const db = require('../config/database');
    const Wallet = require('../models/Wallet');
    const user = req.session.admin_user;
    const { amount, description } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const result = await Wallet.deposit(user.id, parseFloat(amount), 'manual', `ADMIN-${Date.now()}`, description || 'Admin self-deposit');
    res.json({ success: true, message: 'Deposit successful', ...result });
  } catch (error) {
    console.error('Admin wallet deposit error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMIN WITHDRAWALS API (Read-only - Auto-approved) ====================
router.get('/withdrawals', async (req, res) => {
  console.log('=== WITHDRAWALS ROUTE HIT ===', { query: req.query });
  try {
    const db = require('../config/database');
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let where = "WHERE 1=1";
    const params = [];
    if (status && status !== 'all') { where += ' AND rw.status = ?'; params.push(status); }
    
    const query1 = `SELECT rw.*, u.name as user_name, u.phone_number, u.email,
              r.commission_rate, r.tier
       FROM reseller_withdrawals rw
       JOIN users u ON rw.user_id = u.id
       JOIN resellers r ON rw.reseller_id = r.id
       ${where} ORDER BY rw.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    
    console.log('Query:', query1, params);
    
    const [withdrawals] = await db.execute(query1, params);
    console.log('Withdrawals found:', withdrawals.length);
    
    const query2 = `SELECT COUNT(*) as total FROM reseller_withdrawals rw
       JOIN users u ON rw.user_id = u.id
       JOIN resellers r ON rw.reseller_id = r.id
       ${where}`;
    
    const [countResult] = await db.execute(query2, params);
    console.log('Count result:', countResult[0]);
    
    res.json({
      success: true,
      data: withdrawals,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult[0].total, pages: Math.ceil(countResult[0].total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Admin withdrawals error:', error);
    res.status(500).json({ error: 'Failed to load withdrawals' });
  }
});

router.get('/withdrawal-stats', async (req, res) => {
  try {
    const db = require('../config/database');
    const [pending] = await db.execute("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM reseller_withdrawals WHERE status='pending'");
    const [approved] = await db.execute("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM reseller_withdrawals WHERE status='approved'");
    const [paid] = await db.execute("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM reseller_withdrawals WHERE status='paid'");
    const [rejected] = await db.execute("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM reseller_withdrawals WHERE status='rejected'");
    const [total] = await db.execute("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM reseller_withdrawals");
    const [today] = await db.execute("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM reseller_withdrawals WHERE DATE(created_at) = CURDATE()");
    res.json({
      success: true,
      stats: {
        pending: { count: pending[0].count, total: Number(pending[0].total) },
        approved: { count: approved[0].count, total: Number(approved[0].total) },
        paid: { count: paid[0].count, total: Number(paid[0].total) },
        rejected: { count: rejected[0].count, total: Number(rejected[0].total) },
        total: { count: total[0].count, total: Number(total[0].total) },
        today: { count: today[0].count, total: Number(today[0].total) }
      }
    });
  } catch (error) {
    console.error('Withdrawal stats error:', error.message);
    res.status(500).json({ error: 'Failed to load withdrawal stats' });
  }
});

// ==================== ADMIN RESELLERS API ====================
router.get('/resellers', async (req, res) => {
  try {
    const db = require('../config/database');
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = "WHERE u.role = 'reseller'";
    const params = [];
    if (search) { where += ' AND (u.name LIKE ? OR u.phone_number LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    const [resellers] = await db.execute(
      `SELECT u.id, u.name, u.email, u.phone_number, u.is_active, u.created_at,
              COALESCE(r.balance,0) as wallet_balance, COALESCE(r.total_earned,0) as total_earned, r.status as reseller_status,
              (SELECT COUNT(*) FROM vouchers v JOIN voucher_batches vb ON v.batch_id = vb.id WHERE vb.created_by = u.id) as total_vouchers,
              (SELECT COUNT(*) FROM vouchers v JOIN voucher_batches vb ON v.batch_id = vb.id WHERE vb.created_by = u.id AND v.is_used = 1) as redeemed_vouchers
       FROM users u LEFT JOIN resellers r ON u.id = r.user_id
       ${where} ORDER BY u.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`, params
    );
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM users u ${where}`, params
    );
    res.json({
      success: true,
      data: resellers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult[0].total, pages: Math.ceil(countResult[0].total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Admin resellers error:', error.message);
    res.status(500).json({ error: 'Failed to load resellers' });
  }
});

router.get('/resellers/:id', async (req, res) => {
  try {
    const db = require('../config/database');
    const { id } = req.params;
    const [users] = await db.execute(
      `SELECT u.*, COALESCE(r.balance,0) as wallet_balance, COALESCE(r.total_earned,0) as total_earned, r.id as reseller_record_id
       FROM users u LEFT JOIN resellers r ON u.id = r.user_id WHERE u.id = ? AND u.role = 'reseller'`, [id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'Reseller not found' });
    const user = users[0];
    const [batches] = await db.execute(
      'SELECT * FROM voucher_batches WHERE created_by = ? ORDER BY created_at DESC LIMIT 20', [id]
    );
    const [transactions] = await db.execute(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [id]
    );
    const [wallet] = await db.execute('SELECT * FROM wallets WHERE user_id = ?', [id]);
    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, phone_number: user.phone_number, is_active: user.is_active, created_at: user.created_at },
      wallet: wallet[0] || { balance: user.wallet_balance || 0 },
      batches,
      transactions,
      stats: { wallet_balance: user.wallet_balance, total_earned: user.total_earned }
    });
  } catch (error) {
    console.error('Admin reseller detail error:', error.message);
    res.status(500).json({ error: 'Failed to load reseller details' });
  }
});

router.post('/resellers/:id/deposit', async (req, res) => {
  try {
    const db = require('../config/database');
    const Wallet = require('../models/Wallet');
    const { id } = req.params;
    const { amount, description } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ error: 'Minimum deposit is TSh 100' });
    const [users] = await db.execute("SELECT id FROM users WHERE id = ? AND role = 'reseller'", [id]);
    if (users.length === 0) return res.status(404).json({ error: 'Reseller not found' });
    await db.execute('UPDATE resellers SET balance = balance + ? WHERE user_id = ?', [parseFloat(amount), id]);
    await Wallet.deposit(id, parseFloat(amount), 'manual', `ADMIN-DEPOSIT-${Date.now()}`, description || 'Admin deposit to reseller');
    const [updated] = await db.execute('SELECT balance FROM resellers WHERE user_id = ?', [id]);
    res.json({ success: true, message: 'Deposit successful', balance: updated[0]?.balance || 0 });
  } catch (error) {
    console.error('Reseller deposit error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/resellers/:id/deduct', async (req, res) => {
  try {
    const db = require('../config/database');
    const { id } = req.params;
    const { amount, description } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ error: 'Minimum deduction is TSh 100' });
    const [resellerRows] = await db.execute('SELECT balance FROM resellers WHERE user_id = ?', [id]);
    if (resellerRows.length === 0) return res.status(404).json({ error: 'Reseller not found' });
    if (parseFloat(resellerRows[0].balance) < parseFloat(amount)) {
      return res.status(400).json({ error: `Insufficient balance. Available: TSh ${Number(resellerRows[0].balance).toLocaleString()}` });
    }
    await db.execute('UPDATE resellers SET balance = balance - ? WHERE user_id = ?', [parseFloat(amount), id]);
    await db.execute(
      `INSERT INTO transactions (user_id, transaction_type, amount, status, payment_method, description, created_at)
       VALUES (?, 'deduction', ?, 'completed', 'manual', ?, NOW())`,
      [id, parseFloat(amount), description || 'Admin deduction from reseller']
    );
    const [updated] = await db.execute('SELECT balance FROM resellers WHERE user_id = ?', [id]);
    res.json({ success: true, message: 'Deduction successful', balance: updated[0]?.balance || 0 });
  } catch (error) {
    console.error('Reseller deduct error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROUTER MANAGEMENT (proxy to routerRoutes) ====================
router.use('/routers', require('./routerRoutes'));

// ==================== PACKAGE MANAGEMENT API ====================
router.post('/packages', async (req, res) => {
  try {
    const db = require('../config/database');
    const { name, description, duration_hours, price, currency, data_limit_mb, speed_limit_mbps, is_active, sort_order } = req.body;
    if (!name || !duration_hours || !price) {
      return res.status(400).json({ success: false, error: 'Name, duration, and price are required' });
    }
    const [result] = await db.execute(
      'INSERT INTO packages (name, description, duration_hours, price, currency, data_limit_mb, speed_limit_mbps, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description || '', duration_hours, price, currency || 'TZS', data_limit_mb || 0, speed_limit_mbps || 0, is_active !== undefined ? is_active : 1, sort_order || 0]
    );
    res.json({ success: true, id: result.insertId, message: 'Package created' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/packages/:id', async (req, res) => {
  try {
    const db = require('../config/database');
    const { name, description, duration_hours, price, currency, data_limit_mb, speed_limit_mbps, is_active, sort_order } = req.body;
    await db.execute(
      'UPDATE packages SET name=?, description=?, duration_hours=?, price=?, currency=?, data_limit_mb=?, speed_limit_mbps=?, is_active=?, sort_order=? WHERE id=?',
      [name, description || '', duration_hours, price, currency || 'TZS', data_limit_mb || 0, speed_limit_mbps || 0, is_active !== undefined ? is_active : 1, sort_order || 0, req.params.id]
    );
    res.json({ success: true, message: 'Package updated' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/packages/:id', async (req, res) => {
  try {
    const db = require('../config/database');
    await db.execute('DELETE FROM packages WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Package deleted' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// All packages (including inactive)
router.get('/packages/all', async (req, res) => {
  try {
    const db = require('../config/database');
    const [packages] = await db.execute('SELECT * FROM packages ORDER BY sort_order ASC, price ASC');
    res.json({ success: true, data: packages, count: packages.length });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Voucher listing with filters
router.get('/vouchers/list', async (req, res) => {
  try {
    const db = require('../config/database');
    const { status, package_id, batch_id, search, page = 1, limit = 50 } = req.query;
    let where = '1=1';
    const params = [];
    if (status === 'used') { where += ' AND v.is_used = 1'; }
    else if (status === 'available') { where += ' AND v.is_used = 0'; }
    else if (status === 'expired') { where += ' AND v.expires_at IS NOT NULL AND v.expires_at < NOW() AND v.is_used = 0'; }
    if (package_id) { where += ' AND v.package_id = ?'; params.push(package_id); }
    if (batch_id) { where += ' AND v.batch_id = ?'; params.push(batch_id); }
    if (search) { where += ' AND (v.voucher_code LIKE ? OR p.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [countResult] = await db.execute(`SELECT COUNT(*) as total FROM vouchers v LEFT JOIN packages p ON v.package_id = p.id WHERE ${where}`, params);
    const total = countResult[0]?.total || 0;
    const [vouchers] = await db.execute(
      `SELECT v.*, p.name as package_name, p.duration_hours, vb.batch_name, vb.issued_to, u.name as used_by_name
       FROM vouchers v LEFT JOIN packages p ON v.package_id = p.id LEFT JOIN voucher_batches vb ON v.batch_id = vb.id LEFT JOIN users u ON v.used_by = u.id
       WHERE ${where} ORDER BY v.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`, params
    );
    res.json({ success: true, data: vouchers, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Enhanced voucher stats with per-package breakdown
router.get('/vouchers/stats-full', async (req, res) => {
  try {
    const db = require('../config/database');
    const [total] = await db.execute('SELECT COUNT(*) as c FROM vouchers');
    const [available] = await db.execute('SELECT COUNT(*) as c FROM vouchers WHERE is_used = 0');
    const [used] = await db.execute('SELECT COUNT(*) as c FROM vouchers WHERE is_used = 1');
    const [expired] = await db.execute('SELECT COUNT(*) as c FROM vouchers WHERE is_used = 0 AND expires_at IS NOT NULL AND expires_at < NOW()');
    const [todayUsed] = await db.execute('SELECT COUNT(*) as c FROM vouchers WHERE is_used = 1 AND DATE(used_at) = CURDATE()');
    const [todayRevenue] = await db.execute('SELECT COALESCE(SUM(price), 0) as total FROM vouchers WHERE is_used = 1 AND DATE(used_at) = CURDATE()');
    const [totalRevenue] = await db.execute('SELECT COALESCE(SUM(price), 0) as total FROM vouchers WHERE is_used = 1');
    const [byPackage] = await db.execute(
      `SELECT p.id, p.name, p.price, p.duration_hours, COUNT(v.id) as total, SUM(CASE WHEN v.is_used = 0 THEN 1 ELSE 0 END) as available, SUM(CASE WHEN v.is_used = 1 THEN 1 ELSE 0 END) as used
       FROM packages p LEFT JOIN vouchers v ON p.id = v.package_id GROUP BY p.id ORDER BY p.price ASC`
    );
    const [recentBatches] = await db.execute(
      `SELECT vb.*, u.name as created_by_name, (SELECT COUNT(*) FROM vouchers WHERE batch_id = vb.id) as voucher_count,
       (SELECT COUNT(*) FROM vouchers WHERE batch_id = vb.id AND is_used = 1) as redeemed_count
       FROM voucher_batches vb LEFT JOIN users u ON vb.created_by = u.id ORDER BY vb.created_at DESC LIMIT 10`
    );
    res.json({
      success: true,
      total: total[0]?.c || 0,
      available: available[0]?.c || 0,
      used: used[0]?.c || 0,
      expired: expired[0]?.c || 0,
      todayUsed: todayUsed[0]?.c || 0,
      todayRevenue: todayRevenue[0]?.total || 0,
      totalRevenue: totalRevenue[0]?.total || 0,
      byPackage, recentBatches
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ==================== API ROUTES (JSON RESPONSES) ====================

// 🔐 ACCOUNT API
router.post('/change-password', adminController.changePassword);

// 📊 DASHBOARD & ANALYTICS API
router.get('/dashboard-stats', adminController.dashboardStats);
router.get('/analytics-data', adminController.getAnalyticsData);
router.get('/reports-data', adminController.reportsData);

// 👥 USER MANAGEMENT API
router.get('/customers', adminController.getCustomers);
router.get('/online-customers', adminController.getOnlineCustomers);
router.post('/suspend-customer/:id', adminController.suspendCustomer);
router.post('/unsuspend/:id', adminController.unsuspendCustomer);
router.post('/adjust-subscription/:id', adminController.adjustCustomerSubscription);
router.delete('/delete-customer/:id', adminController.deleteCustomer);

// 📡 ROUTER MANAGEMENT API
router.get('/routers', adminController.getRouters);
router.get('/router-sessions/:routerID', adminController.getRouterSessions);
router.post('/reboot-router/:routerID', adminController.rebootRouter);

// 🎫 VOUCHER MANAGEMENT API
router.post('/generate-voucher', adminController.generateVoucher);
router.get('/batches', adminController.getBatches);
router.get('/vouchers/batch/:batchId', adminController.getVouchersByBatch);
router.get('/voucher-report', adminController.getVoucherReport);
router.get('/sales-summary', adminController.getSalesSummary);
router.get('/voucher-stats', adminController.getVoucherStats);

// 📢 ADVERTISEMENT MANAGEMENT API
router.get('/ads-approve', adminController.getAdsToApprove);
router.post('/approve-ad/:id', adminController.approveAd);
router.post('/decline-ad/:id', adminController.declineAd);
router.post('/create-ad', adminController.createAd);
router.put('/update-ad/:id', adminController.updateAd);
router.post('/upload-video', adminController.uploadVideo);
router.get('/video-ads', adminController.getVideoAds);

// ⚙️ SYSTEM & SETTINGS API
router.get('/system-settings', adminController.getSystemSettings);
router.put('/system-settings', adminController.updateSystemSettings);
router.get('/packages', adminController.getPackages);
router.get('/sponsors', adminController.getSponsors);

// 🔔 NOTIFICATIONS API
router.get('/notifications', adminController.getNotifications);
router.put('/notification-read/:id', adminController.markNotificationRead);

// 💰 REVENUE & CLICKPESA API
router.get('/revenue', async (req, res) => {
  try {
    const db = require('../config/database');
    const { from, to } = req.query;

    const clickParams = [];
    const pesapalParams = [];
    let clickWhere = "WHERE ct.status IN ('SUCCESS','SETTLED')";
    let pesapalWhere = "WHERE pr.status = 'completed' AND pr.payment_method = 'pesapal'";
    if (from) {
      clickWhere += ' AND ct.created_at >= ?';
      clickParams.push(from + ' 00:00:00');
      pesapalWhere += ' AND COALESCE(pr.completed_at, pr.created_at) >= ?';
      pesapalParams.push(from + ' 00:00:00');
    }
    if (to) {
      clickWhere += ' AND ct.created_at <= ?';
      clickParams.push(to + ' 23:59:59');
      pesapalWhere += ' AND COALESCE(pr.completed_at, pr.created_at) <= ?';
      pesapalParams.push(to + ' 23:59:59');
    }

    const [clickTransactions] = await db.execute(
      `SELECT ct.*, u.name AS user_name, u.phone_number
       FROM clickpesa_transactions ct
       LEFT JOIN users u ON ct.user_id = u.id
       ${clickWhere}
       ORDER BY ct.created_at DESC LIMIT 200`, clickParams
    );

    const [pesapalTransactions] = await db.execute(
      `SELECT pr.id, pr.reference_number, pr.amount, pr.created_at, pr.completed_at, pr.callback_data,
              u.name AS user_name, u.phone_number
       FROM payment_requests pr
       LEFT JOIN users u ON pr.user_id = u.id
       ${pesapalWhere}
       ORDER BY COALESCE(pr.completed_at, pr.created_at) DESC LIMIT 200`, pesapalParams
    );

    const pesapalRows = pesapalTransactions.map((pr) => {
      let data = {};
      try {
        data = typeof pr.callback_data === 'string' ? JSON.parse(pr.callback_data) : (pr.callback_data || {});
      } catch (_) { data = {}; }
      const purpose = data.type === 'wallet_topup'
        ? 'wallet_topup'
        : data.gift
          ? 'gift_purchase'
          : 'package_purchase';
      return {
        id: `pesapal-${pr.id}`,
        order_reference: pr.reference_number,
        user_name: pr.user_name,
        phone: pr.phone_number,
        purpose,
        amount: pr.amount,
        channel: 'pesapal',
        status: 'SUCCESS',
        created_at: pr.completed_at || pr.created_at,
      };
    });

    const transactions = [
      ...clickTransactions.map((row) => ({ ...row, phone: row.phone || row.phone_number, channel: row.channel || 'clickpesa' })),
      ...pesapalRows,
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 200);

    const [clickTotal] = await db.execute(
      `SELECT COALESCE(SUM(ct.amount),0) AS totalRevenue FROM clickpesa_transactions ct ${clickWhere}`, clickParams
    );
    const [pesapalTotal] = await db.execute(
      `SELECT COALESCE(SUM(pr.amount),0) AS totalRevenue FROM payment_requests pr ${pesapalWhere}`, pesapalParams
    );
    const totalRevenue = Number(clickTotal[0]?.totalRevenue || 0) + Number(pesapalTotal[0]?.totalRevenue || 0);

    const todayClickWhere = clickWhere + ' AND DATE(ct.created_at) = CURDATE()';
    const todayPesapalWhere = pesapalWhere + ' AND DATE(COALESCE(pr.completed_at, pr.created_at)) = CURDATE()';
    const [clickToday] = await db.execute(
      `SELECT COALESCE(SUM(ct.amount),0) AS todayRevenue, COUNT(*) AS totalOrders FROM clickpesa_transactions ct ${todayClickWhere}`, clickParams
    );
    const [pesapalToday] = await db.execute(
      `SELECT COALESCE(SUM(pr.amount),0) AS todayRevenue, COUNT(*) AS totalOrders FROM payment_requests pr ${todayPesapalWhere}`, pesapalParams
    );

    const [vouchersAgg] = await db.execute(
      `SELECT COUNT(*) AS vouchersSold, COALESCE(SUM(price),0) AS vouchersRevenue FROM vouchers WHERE is_used = 1 AND used_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
    );

    // Chart data: last 7 days, both gateways
    const [chartRows] = await db.execute(
      `SELECT day, COALESCE(SUM(total),0) AS total FROM (
         SELECT DATE(ct.created_at) AS day, ct.amount AS total
         FROM clickpesa_transactions ct
         ${clickWhere} AND ct.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         UNION ALL
         SELECT DATE(COALESCE(pr.completed_at, pr.created_at)) AS day, pr.amount AS total
         FROM payment_requests pr
         ${pesapalWhere} AND COALESCE(pr.completed_at, pr.created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       ) x GROUP BY day ORDER BY day`, [...clickParams, ...pesapalParams]
    );

    res.json({
      success: true,
      transactions,
      totalRevenue,
      todayRevenue: Number(clickToday[0]?.todayRevenue || 0) + Number(pesapalToday[0]?.todayRevenue || 0),
      totalOrders: Number(clickToday[0]?.totalOrders || 0) + Number(pesapalToday[0]?.totalOrders || 0),
      vouchersSold: vouchersAgg[0]?.vouchersSold || 0,
      chartData: {
        labels: chartRows.map(r => {
          const d = new Date(r.day);
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        }),
        data: chartRows.map(r => r.total)
      }
    });
  } catch (error) {
    console.error('Revenue API error:', error.message);
    res.status(500).json({ error: 'Failed to load revenue data' });
  }
});

// ==================== UNIFIED PAYMENTS LEDGER ====================
// Consolidates every money movement across the platform: gateway checkouts,
// wallet ledger entries, reseller withdrawals, partner revenue shares and
// bank invoices. HQ uses this as the single source of truth.
router.get('/payments', async (req, res) => {
  try {
    const db = require('../config/database');
    const {
      from, to,
      source = 'all',
      status = 'all',
      role = 'all',
      q = '',
      page = 1,
      limit = 50
    } = req.query;

    const dateStart = from ? `${from} 00:00:00` : null;
    const dateEnd = to ? `${to} 23:59:59` : null;
    const BUSINESS_ROLES = ['admin', 'super_admin', 'sponsor', 'bank_partner', 'franchise_owner', 'reseller'];

    const whereDate = (column, params) => {
      let sql = '';
      if (dateStart) { sql += ` AND ${column} >= ?`; params.push(dateStart); }
      if (dateEnd) { sql += ` AND ${column} <= ?`; params.push(dateEnd); }
      return sql;
    };

    const normalizeStatus = (value) => {
      const v = String(value || '').toLowerCase();
      if (['completed', 'success', 'settled', 'paid', 'processed'].includes(v)) return 'completed';
      if (['pending', 'processing', 'approved', 'sent', 'draft', 'unknown'].includes(v)) return 'pending';
      if (['failed', 'rejected', 'cancelled', 'canceled', 'timeout', 'overdue', 'reversed'].includes(v)) return 'failed';
      return v || 'pending';
    };

    const rows = [];
    const push = (row) => rows.push(row);

    // 1) PesaPal + legacy mobile-money payment requests
    if (source === 'all' || source === 'pesapal' || source === 'mobile_money') {
      const params = [];
      let sql = `SELECT pr.id, pr.user_id, pr.payment_method, pr.amount, pr.phone_number,
                        pr.reference_number, pr.merchant_request_id, pr.status, pr.status_message,
                        pr.callback_data, pr.completed_at, pr.created_at,
                        u.name AS user_name, u.role AS user_role, u.company_name
                 FROM payment_requests pr
                 LEFT JOIN users u ON pr.user_id = u.id
                 WHERE 1=1`;
      sql += whereDate('pr.created_at', params);
      sql += ' ORDER BY pr.created_at DESC LIMIT 3000';
      const [list] = await db.execute(sql, params);
      for (const pr of list) {
        const src = pr.payment_method === 'pesapal' ? 'pesapal' : 'mobile_money';
        if (source !== 'all' && source !== src) continue;
        let data = {};
        try {
          data = typeof pr.callback_data === 'string' ? JSON.parse(pr.callback_data) : (pr.callback_data || {});
        } catch (_) { data = {}; }
        const purpose = data.type === 'wallet_topup'
          ? 'Wallet top-up'
          : data.gift
            ? 'Gift voucher'
            : data.package_id
              ? 'Package purchase'
              : 'Payment';
        push({
          id: `${src}-${pr.id}`,
          source: src,
          direction: 'inflow',
          reference: pr.reference_number || pr.merchant_request_id || `PR-${pr.id}`,
          user_id: pr.user_id,
          user_name: pr.user_name || 'Customer',
          user_role: pr.user_role || 'customer',
          business_name: pr.company_name || '',
          phone: pr.phone_number,
          amount: Number(pr.amount || 0),
          currency: 'TZS',
          status: normalizeStatus(pr.status),
          raw_status: String(pr.status || '').toUpperCase(),
          purpose,
          payment_method: pr.payment_method,
          created_at: pr.created_at,
          completed_at: pr.completed_at
        });
      }
    }

    // 2) ClickPesa transactions
    if (source === 'all' || source === 'clickpesa') {
      const params = [];
      let sql = `SELECT ct.id, ct.user_id, ct.order_reference, ct.amount, ct.phone, ct.purpose,
                        ct.status, ct.channel, ct.created_at, ct.updated_at,
                        u.name AS user_name, u.role AS user_role, u.company_name
                 FROM clickpesa_transactions ct
                 LEFT JOIN users u ON ct.user_id = u.id
                 WHERE 1=1`;
      sql += whereDate('ct.created_at', params);
      sql += ' ORDER BY ct.created_at DESC LIMIT 3000';
      const [list] = await db.execute(sql, params);
      for (const ct of list) {
        const purposeMap = {
          package_purchase: 'Package purchase',
          gift_purchase: 'Gift voucher',
          wallet_topup: 'Wallet top-up',
          reseller_topup: 'Reseller wallet top-up',
          sponsor_deposit: 'Sponsor deposit',
          payment: 'Payment'
        };
        push({
          id: `clickpesa-${ct.id}`,
          source: 'clickpesa',
          direction: 'inflow',
          reference: ct.order_reference || `CP-${ct.id}`,
          user_id: ct.user_id,
          user_name: ct.user_name || 'Customer',
          user_role: ct.user_role || 'customer',
          business_name: ct.company_name || '',
          phone: ct.phone,
          amount: Number(ct.amount || 0),
          currency: 'TZS',
          status: normalizeStatus(ct.status),
          raw_status: String(ct.status || '').toUpperCase(),
          purpose: purposeMap[ct.purpose] || ct.purpose || 'Payment',
          payment_method: 'clickpesa',
          created_at: ct.created_at,
          completed_at: ['SUCCESS', 'SETTLED'].includes(String(ct.status || '').toUpperCase()) ? ct.updated_at : null
        });
      }
    }

    // 3) Internal wallet ledger. Skip gateway duplicates and WDR-% rows
    //    because those are represented by their own source records.
    if (source === 'all' || source === 'wallet') {
      const params = [];
      let sql = `SELECT t.id, t.user_id, t.transaction_type, t.amount, t.currency,
                        t.payment_method, t.payment_reference, t.reference_type, t.reference_id,
                        t.description, t.status, t.processed_at, t.created_at,
                        u.name AS user_name, u.role AS user_role, u.company_name
                 FROM transactions t
                 LEFT JOIN users u ON t.user_id = u.id
                 WHERE NOT (t.transaction_type = 'withdrawal' AND t.payment_reference LIKE 'WDR-%')
                   AND NOT (t.transaction_type = 'revenue_share' AND t.reference_type = 'payout')
                   AND NOT (t.transaction_type = 'deposit' AND t.payment_reference IS NOT NULL AND (
                     EXISTS (SELECT 1 FROM payment_requests pr WHERE pr.reference_number = t.payment_reference)
                     OR EXISTS (SELECT 1 FROM clickpesa_transactions ct WHERE ct.order_reference = t.payment_reference)
                   ))`;
      sql += whereDate('t.created_at', params);
      sql += ' ORDER BY t.created_at DESC LIMIT 3000';
      const [list] = await db.execute(sql, params);
      for (const t of list) {
        const type = t.transaction_type;
        const direction = ['withdrawal', 'refund', 'commission', 'revenue_share'].includes(type)
          ? 'outflow'
          : 'inflow';
        const purposeMap = {
          deposit: 'Wallet deposit',
          withdrawal: 'Wallet withdrawal',
          campaign_charge: 'Campaign charge',
          refund: 'Wallet refund',
          commission: 'Commission',
          revenue_share: 'Revenue share'
        };
        push({
          id: `wallet-${t.id}`,
          source: 'wallet',
          direction,
          reference: t.payment_reference || `TXN-${t.id}`,
          user_id: t.user_id,
          user_name: t.user_name || 'User',
          user_role: t.user_role || 'customer',
          business_name: t.company_name || '',
          phone: null,
          amount: Number(t.amount || 0),
          currency: t.currency || 'TZS',
          status: normalizeStatus(t.status),
          raw_status: String(t.status || '').toUpperCase(),
          purpose: purposeMap[type] || type,
          payment_method: t.payment_method || 'system',
          created_at: t.created_at,
          completed_at: t.processed_at
        });
      }
    }

    // 4) Reseller withdrawals (payouts leaving the platform)
    if (source === 'all' || source === 'withdrawal') {
      const params = [];
      let sql = `SELECT rw.id, rw.user_id, rw.reseller_id, rw.amount, rw.payment_method,
                        rw.payment_phone, rw.status, rw.processed_at, rw.notes, rw.created_at,
                        u.name AS user_name, u.role AS user_role, u.company_name
                 FROM reseller_withdrawals rw
                 LEFT JOIN users u ON rw.user_id = u.id
                 WHERE 1=1`;
      sql += whereDate('rw.created_at', params);
      sql += ' ORDER BY rw.created_at DESC LIMIT 3000';
      const [list] = await db.execute(sql, params);
      for (const rw of list) {
        push({
          id: `withdrawal-${rw.id}`,
          source: 'withdrawal',
          direction: 'outflow',
          reference: `WDR-${rw.id}`,
          user_id: rw.user_id,
          user_name: rw.user_name || 'Reseller',
          user_role: rw.user_role || 'reseller',
          business_name: rw.company_name || '',
          phone: rw.payment_phone,
          amount: Number(rw.amount || 0),
          currency: 'TZS',
          status: normalizeStatus(rw.status),
          raw_status: String(rw.status || '').toUpperCase(),
          purpose: 'Reseller withdrawal',
          payment_method: rw.payment_method || 'mobile_money',
          created_at: rw.created_at,
          completed_at: rw.processed_at
        });
      }
    }

    // 5) Partner revenue shares (partner payouts)
    if (source === 'all' || source === 'revenue_share') {
      const params = [];
      let sql = `SELECT prs.id, prs.partner_id AS user_id, prs.partner_type, prs.period_start,
                        prs.period_end, prs.total_revenue, prs.share_amount, prs.share_percentage,
                        prs.status, prs.paid_at, prs.payment_reference, prs.created_at,
                        u.name AS user_name, u.role AS user_role, u.company_name
                 FROM partner_revenue_shares prs
                 LEFT JOIN users u ON prs.partner_id = u.id
                 WHERE 1=1`;
      sql += whereDate('prs.created_at', params);
      sql += ' ORDER BY prs.created_at DESC LIMIT 3000';
      const [list] = await db.execute(sql, params);
      for (const prs of list) {
        push({
          id: `revenue-share-${prs.id}`,
          source: 'revenue_share',
          direction: 'outflow',
          reference: prs.payment_reference || `RS-${prs.id}`,
          user_id: prs.user_id,
          user_name: prs.user_name || 'Partner',
          user_role: prs.user_role || prs.partner_type,
          business_name: prs.company_name || '',
          phone: null,
          amount: Number(prs.share_amount || 0),
          currency: 'TZS',
          status: normalizeStatus(prs.status),
          raw_status: String(prs.status || '').toUpperCase(),
          purpose: `Partner revenue share (${String(prs.partner_type || '').replace(/_/g, ' ')})`,
          payment_method: 'system',
          created_at: prs.created_at,
          completed_at: prs.paid_at
        });
      }
    }

    // 6) Bank partner invoices (HQ receivables)
    if (source === 'all' || source === 'invoice') {
      const params = [];
      let sql = `SELECT i.id, i.user_id, i.invoice_number, i.total_amount, i.currency,
                        i.status, i.due_date, i.paid_at, i.payment_reference, i.created_at,
                        u.name AS user_name, u.role AS user_role, u.company_name
                 FROM invoices i
                 LEFT JOIN users u ON i.user_id = u.id
                 WHERE 1=1`;
      sql += whereDate('i.created_at', params);
      sql += ' ORDER BY i.created_at DESC LIMIT 3000';
      const [list] = await db.execute(sql, params);
      for (const inv of list) {
        push({
          id: `invoice-${inv.id}`,
          source: 'invoice',
          direction: 'inflow',
          reference: inv.invoice_number || `INV-${inv.id}`,
          user_id: inv.user_id,
          user_name: inv.user_name || 'Bank partner',
          user_role: inv.user_role || 'bank_partner',
          business_name: inv.company_name || '',
          phone: null,
          amount: Number(inv.total_amount || 0),
          currency: inv.currency || 'TZS',
          status: normalizeStatus(inv.status),
          raw_status: String(inv.status || '').toUpperCase(),
          purpose: 'Bank partner invoice',
          payment_method: 'invoice',
          created_at: inv.created_at,
          completed_at: inv.paid_at
        });
      }
    }

    // Apply ledger filters
    let filtered = rows.filter((row) => {
      if (status !== 'all' && row.status !== status) return false;
      if (role !== 'all' && row.user_role !== role) return false;
      return true;
    });

    const needle = String(q || '').trim().toLowerCase();
    if (needle) {
      filtered = filtered.filter((row) => [
        row.user_name, row.business_name, row.phone, row.reference, row.purpose, row.raw_status
      ].some((value) => String(value || '').toLowerCase().includes(needle)));
    }

    filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const isSettled = (row) => row.status === 'completed';
    const sum = (list) => list.reduce((total, row) => total + Number(row.amount || 0), 0);

    const inflow = filtered.filter((row) => row.direction === 'inflow');
    const outflow = filtered.filter((row) => row.direction === 'outflow');
    const pending = filtered.filter((row) => row.status === 'pending');
    const failed = filtered.filter((row) => row.status === 'failed');

    const settledInflow = sum(inflow.filter(isSettled));
    const settledOutflow = sum(outflow.filter(isSettled));

    const groupBy = (list, keyFn) => {
      const map = new Map();
      for (const row of list) {
        const key = keyFn(row);
        if (!map.has(key)) {
          map.set(key, { key, count: 0, inflow: 0, outflow: 0, pending: 0, failed: 0, total: 0 });
        }
        const agg = map.get(key);
        agg.count += 1;
        agg.total += Number(row.amount || 0);
        if (row.status === 'completed') {
          if (row.direction === 'inflow') agg.inflow += Number(row.amount || 0);
          else agg.outflow += Number(row.amount || 0);
        }
        if (row.status === 'pending') agg.pending += 1;
        if (row.status === 'failed') agg.failed += 1;
      }
      return Array.from(map.values()).sort((a, b) => (b.inflow + b.outflow) - (a.inflow + a.outflow));
    };

    // Business accounts: every partner/business user plus their ledger totals
    const [accountRows] = await db.execute(
      `SELECT u.id, u.name, u.phone_number, u.email, u.role, u.company_name,
              u.is_active, u.created_at,
              w.balance AS wallet_balance, w.total_deposited, w.total_spent, w.total_withdrawn,
              r.balance AS reseller_balance, r.total_earned, r.status AS reseller_status, r.tier
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       LEFT JOIN resellers r ON r.user_id = u.id
       WHERE u.role IN (${BUSINESS_ROLES.map(() => '?').join(',')})
       ORDER BY u.created_at DESC`,
      BUSINESS_ROLES
    );

    const perUser = new Map();
    for (const row of filtered) {
      if (!row.user_id) continue;
      if (!perUser.has(row.user_id)) {
        perUser.set(row.user_id, { inflow: 0, outflow: 0, pending: 0, count: 0, last_activity: null });
      }
      const agg = perUser.get(row.user_id);
      agg.count += 1;
      if (row.status === 'completed') {
        if (row.direction === 'inflow') agg.inflow += Number(row.amount || 0);
        else agg.outflow += Number(row.amount || 0);
      }
      if (row.status === 'pending') agg.pending += 1;
      if (!agg.last_activity || new Date(row.created_at) > new Date(agg.last_activity)) {
        agg.last_activity = row.created_at;
      }
    }

    const accounts = accountRows.map((account) => {
      const agg = perUser.get(account.id) || { inflow: 0, outflow: 0, pending: 0, count: 0, last_activity: null };
      return {
        ...account,
        wallet_balance: Number(account.wallet_balance || 0),
        reseller_balance: account.reseller_balance === null ? null : Number(account.reseller_balance || 0),
        ledger: agg
      };
    });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const total = filtered.length;
    const paged = filtered.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    res.json({
      success: true,
      payments: paged,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.max(1, Math.ceil(total / pageSize))
      },
      summary: {
        inflow: settledInflow,
        outflow: settledOutflow,
        net: settledInflow - settledOutflow,
        pending_amount: sum(pending),
        pending_count: pending.length,
        failed_count: failed.length,
        total_count: total
      },
      bySource: groupBy(filtered, (row) => row.source),
      byRole: groupBy(filtered, (row) => row.user_role || 'customer'),
      byStatus: groupBy(filtered, (row) => row.status),
      accounts,
      filters: { from: from || '', to: to || '', source, status, role, q }
    });
  } catch (error) {
    console.error('Unified payments API error:', error.message);
    res.status(500).json({ error: 'Failed to load unified payments ledger' });
  }
});

router.get('/clickpesa-balance', async (req, res) => {
  try {
    const clickpesa = require('../utils/clickpesa');
    const balance = await clickpesa.getBalance();
    res.json({ success: true, balance });
  } catch (error) {
    console.error('ClickPesa balance unavailable:', error.message);
    res.json({ success: true, balance: null, message: 'Balance unavailable' });
  }
});

// ==================== ADVANCED ROUTER MANAGEMENT ====================
router.get('/routers/:routerID/status', adminController.getRouterLiveStatus);
router.get('/routers/:routerID/sessions', adminController.getRouterHotspotSessions);
router.get('/routers/:routerID/users', adminController.getRouterHotspotUsers);
router.post('/routers/:routerID/kick', adminController.kickHotspotUser);
router.get('/routers/:routerID/bindings', adminController.getRouterBindings);
router.get('/routers/:routerID/interfaces', adminController.getRouterInterfaces);
router.get('/routers/:routerID/logs', adminController.getRouterLogs);
router.get('/routers/:routerID/details', adminController.getRouterDetails);
router.get('/routers/:routerID/active-users', adminController.getRouterActiveUsers);
router.delete('/routers/:routerID', adminController.deleteRouter);
router.get('/routers-status', adminController.getAllRoutersStatus);

// ==================== RECENT ACTIVITY ====================
router.get('/recent-activity', adminController.getRecentActivity);

// ==================== REPORT EXPORT ====================
router.get('/download-report', adminController.downloadReport);

// ==================== LEGACY/COMPATIBILITY ROUTES ====================
// These are kept for backward compatibility

// Analytics compatibility routes
router.get('/analytics', adminController.adminAnalytics);
router.get('/ad-views-data', adminController.getAdViewsData);
router.get('/analytics-stats', adminController.getAnalyticsStats);
router.get('/ad-views', adminController.getAdViewsForAnalytics);

// Ads compatibility routes
router.get('/my-ads', adminController.getMyAdsAPI);

// Router compatibility routes
router.get('/router-health', adminController.getRouterHealth);
router.post('/add-router', adminController.addRouter);
router.put('/update-router/:id', adminController.updateRouter);

// Utility compatibility routes
router.get('/ad-views', adminController.getAdViewsData);

// Legacy user routes (deprecated - use new ones above)
router.post('/set-unlimited', adminController.setUnlimitedStatus);
router.delete('/users/:id', adminController.deleteUser);
router.get('/user-stats', adminController.getUserStats);

module.exports = router;