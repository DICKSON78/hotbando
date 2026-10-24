// routes/admin.js - ORGANIZED & CLEANED
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { csrfProtection } = require('../middleware/security'); // CSRF protection for state-changing requests
const adminAuthController = require('../controllers/adminAuthController');
const { adminAuth } = require('../middleware/authMiddleware');

// ==================== PUBLIC ROUTES (NO AUTH) ====================
router.get('/login', (req, res) => {
    if (req.session.admin_user) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', {
        title: 'Ingia kama Admin - HotBando',
        error: null
    });
});

router.post('/login', (req, res) => adminAuthController.login(req, res));
router.post('/logout', (req, res) => adminAuthController.logout(req, res));

// Password change (session required but not full admin auth - redirects to login if no session)
router.get('/change-password', (req, res) => adminAuthController.showChangePassword(req, res));
router.post('/change-password', (req, res) => adminAuthController.changePassword(req, res));

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

// ==================== ADMIN WITHDRAWALS API ====================
router.get('/withdrawals', async (req, res) => {
  try {
    const db = require('../config/database');
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = "WHERE t.transaction_type = 'withdrawal'";
    const params = [];
    if (status && status !== 'all') { where += ' AND t.status = ?'; params.push(status); }
    const [withdrawals] = await db.execute(
      `SELECT t.*, u.name as user_name, u.phone_number, u.email, u.role as user_role
       FROM transactions t JOIN users u ON t.user_id = u.id
       ${where} ORDER BY t.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`, params
    );
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM transactions t JOIN users u ON t.user_id = u.id ${where}`, params
    );
    res.json({
      success: true,
      data: withdrawals,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult[0].total, pages: Math.ceil(countResult[0].total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Admin withdrawals error:', error.message);
    res.status(500).json({ error: 'Failed to load withdrawals' });
  }
});

router.get('/withdrawal-stats', async (req, res) => {
  try {
    const db = require('../config/database');
    const [pending] = await db.execute("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM transactions WHERE transaction_type='withdrawal' AND status='pending'");
    const [completed] = await db.execute("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM transactions WHERE transaction_type='withdrawal' AND status='completed'");
    const [total] = await db.execute("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM transactions WHERE transaction_type='withdrawal'");
    const [today] = await db.execute("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM transactions WHERE transaction_type='withdrawal' AND DATE(created_at) = CURDATE()");
    res.json({
      success: true,
      pending: { count: pending[0].count, total: pending[0].total },
      completed: { count: completed[0].count, total: completed[0].total },
      total: { count: total[0].count, total: total[0].total },
      today: { count: today[0].count, total: today[0].total }
    });
  } catch (error) {
    console.error('Withdrawal stats error:', error.message);
    res.status(500).json({ error: 'Failed to load withdrawal stats' });
  }
});

router.post('/withdrawals/:id/approve', async (req, res) => {
  try {
    const db = require('../config/database');
    const { id } = req.params;
    const [rows] = await db.execute("SELECT * FROM transactions WHERE id = ? AND transaction_type='withdrawal' AND status='pending'", [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Withdrawal not found or already processed' });
    await db.execute("UPDATE transactions SET status='completed', completed_at=NOW() WHERE id=?", [id]);
    await db.query('INSERT INTO notifications (user_id, notification_type, title, message) VALUES (?, ?, ?, ?)',
      [rows[0].user_id, 'success', 'Withdrawal Completed', `Your withdrawal of TSh ${Number(rows[0].amount).toLocaleString()} has been completed.`]);
    res.json({ success: true, message: 'Withdrawal approved' });
  } catch (error) {
    console.error('Approve withdrawal error:', error.message);
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
});

router.post('/withdrawals/:id/reject', async (req, res) => {
  try {
    const db = require('../config/database');
    const { id } = req.params;
    const [rows] = await db.execute("SELECT * FROM transactions WHERE id = ? AND transaction_type='withdrawal' AND status='pending'", [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Withdrawal not found or already processed' });
    await db.execute("UPDATE transactions SET status='failed', completed_at=NOW() WHERE id=?", [id]);
    await db.execute('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [rows[0].amount, rows[0].user_id]);
    await db.query('INSERT INTO notifications (user_id, notification_type, title, message) VALUES (?, ?, ?, ?)',
      [rows[0].user_id, 'error', 'Withdrawal Rejected', `Your withdrawal of TSh ${Number(rows[0].amount).toLocaleString()} has been rejected. Funds returned to wallet.`]);
    res.json({ success: true, message: 'Withdrawal rejected' });
  } catch (error) {
    console.error('Reject withdrawal error:', error.message);
    res.status(500).json({ error: 'Failed to reject withdrawal' });
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

// ==================== PAGE ROUTES (RENDER EJS) ====================
router.get('/dashboard', adminController.renderDashboardPage);
router.get('/users', adminController.renderUsersPage);
router.get('/vouchers', adminController.renderVouchersPage);
router.get('/video-ads', adminController.renderVideoAdsPage);
router.get('/upload-video', adminController.renderUploadVideoPage);
router.get('/analytics', adminController.renderAnalyticsPage);
router.get('/reports', adminController.renderReportsPage);
router.get('/settings', adminController.renderSettingsPage);
router.get('/my-ads', adminController.renderMyAdsPage);

// Static pages (no controller needed)
router.get('/approve-content', (req, res) => {
    res.render('admin/approve-content', {
        title: 'Idhini ya Maudhui',
        activePage: 'approve-content',
        userName: req.session.admin_user?.name || 'Admin'
    });
});

router.get('/generate-vouchers', (req, res) => {
    res.render('admin/generate-vouchers', {
        title: 'Undaa Vouchers',
        activePage: 'generate-vouchers',
        userName: req.session.admin_user?.name || 'Admin'
    });
});

// New feature pages
router.get('/campaigns', (req, res) => {
    res.render('admin/campaigns', {
        title: 'Kampeni',
        activePage: 'campaigns',
        userName: req.session.admin_user?.name || 'Admin',
        userRole: req.session.admin_user?.role || 'admin'
    });
});

router.get('/leads', (req, res) => {
    res.render('admin/leads', {
        title: 'Wateja Wapya',
        activePage: 'leads',
        userName: req.session.admin_user?.name || 'Admin',
        userRole: req.session.admin_user?.role || 'admin'
    });
});

router.get('/wallet', (req, res) => {
    res.render('admin/wallet', {
        title: 'Pesa Yangu',
        activePage: 'wallet',
        userName: req.session.admin_user?.name || 'Admin',
        userRole: req.session.admin_user?.role || 'admin'
    });
});

router.get('/locations', (req, res) => {
    res.render('admin/locations', {
        title: 'Maeneo',
        activePage: 'locations',
        userName: req.session.admin_user?.name || 'Admin',
        userRole: req.session.admin_user?.role || 'admin'
    });
});

router.get('/routers', (req, res) => {
    res.render('admin/routers', {
        title: 'Routers',
        activePage: 'routers',
        userName: req.session.admin_user?.name || 'Admin',
        userRole: req.session.admin_user?.role || 'admin'
    });
});

router.get('/revenue-share', (req, res) => {
    res.render('admin/revenue-share', {
        title: 'Mgawanyo',
        activePage: 'revenue-share',
        userName: req.session.admin_user?.name || 'Admin',
        userRole: req.session.admin_user?.role || 'admin'
    });
});

router.get('/setup-wizard', (req, res) => {
    res.render('admin/setup-wizard', {
        title: 'Setup Wizard',
        activePage: 'setup-wizard',
        userName: req.session.admin_user?.name || 'Admin',
        userRole: req.session.admin_user?.role || 'admin',
        hotspotAdminPassword: process.env.HOTSPOT_ADMIN_PASSWORD || 'hotbando2024'
    });
});

// ==================== API ROUTES (JSON RESPONSES) ====================

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

    let where = "WHERE ct.status IN ('SUCCESS','SETTLED')";
    const params = [];
    if (from) { where += ' AND ct.created_at >= ?'; params.push(from + ' 00:00:00'); }
    if (to) { where += ' AND ct.created_at <= ?'; params.push(to + ' 23:59:59'); }

    const [transactions] = await db.execute(
      `SELECT ct.*, u.name AS user_name, u.phone_number
       FROM clickpesa_transactions ct
       LEFT JOIN users u ON ct.user_id = u.id
       ${where}
       ORDER BY ct.created_at DESC LIMIT 200`, params
    );

    const [totalAgg] = await db.execute(
      `SELECT COALESCE(SUM(ct.amount),0) AS totalRevenue FROM clickpesa_transactions ct ${where}`, params
    );

    const todayWhere = where + ' AND DATE(ct.created_at) = CURDATE()';
    const [todayAgg] = await db.execute(
      `SELECT COALESCE(SUM(ct.amount),0) AS todayRevenue, COUNT(*) AS totalOrders FROM clickpesa_transactions ct ${todayWhere}`, params
    );

    const [vouchersAgg] = await db.execute(
      `SELECT COUNT(*) AS vouchersSold, COALESCE(SUM(price),0) AS vouchersRevenue FROM vouchers WHERE is_used = 1 AND used_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
    );

    // Chart data: last 7 days
    const [chartRows] = await db.execute(
      `SELECT DATE(created_at) AS day, COALESCE(SUM(amount),0) AS total
       FROM clickpesa_transactions
       WHERE status IN ('SUCCESS','SETTLED') AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at) ORDER BY day`
    );

    res.json({
      success: true,
      transactions,
      totalRevenue: totalAgg[0]?.totalRevenue || 0,
      todayRevenue: todayAgg[0]?.todayRevenue || 0,
      totalOrders: todayAgg[0]?.totalOrders || 0,
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