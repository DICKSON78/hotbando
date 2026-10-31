// routes/business.js — Production Business Module APIs
const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/authMiddleware');
const db = require('../config/database');

router.use(adminAuth);

// ═══════════════════════════════════════════════════════════════
// CUSTOMERS — CRM, Segmentation, Lifecycle
// ═══════════════════════════════════════════════════════════════

// GET /customers — Enhanced customer list with proper fields, filtering, stats
router.get('/customers', async (req, res) => {
  try {
    const { search = '', status, page = 1, limit = 20, sort = 'created_at', order = 'DESC', date_from, date_to, package_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = "WHERE u.role = 'customer'";
    const params = [];

    if (search) { where += ' AND (u.name LIKE ? OR u.phone_number LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (status === 'active') { where += ' AND u.is_active = 1'; }
    else if (status === 'suspended') { where += ' AND u.is_active = 0'; }
    if (date_from) { where += ' AND u.created_at >= ?'; params.push(date_from + ' 00:00:00'); }
    if (date_to) { where += ' AND u.created_at <= ?'; params.push(date_to + ' 23:59:59'); }
    if (package_id) { where += ' AND u.package = ?'; params.push(package_id); }

    const allowedSorts = ['created_at', 'name', 'moneyspent', 'package'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [countResult] = await db.execute(`SELECT COUNT(*) as total FROM users u ${where}`, params);
    const total = countResult[0]?.total || 0;

    const [customers] = await db.execute(
      `SELECT u.id, u.name, u.phone_number, u.email, u.is_active, u.role, u.created_at, u.last_login,
              u.package, u.moneyspent, u.usage_until,
              (SELECT COUNT(*) FROM clickpesa_transactions ct WHERE ct.user_id = u.id AND ct.status IN ('SUCCESS','SETTLED')) as payment_count,
              (SELECT COALESCE(SUM(ct.amount),0) FROM clickpesa_transactions ct WHERE ct.user_id = u.id AND ct.status IN ('SUCCESS','SETTLED')) as total_payments,
              (SELECT COUNT(*) FROM vouchers v WHERE v.used_by = u.id) as vouchers_redeemed,
              (SELECT v.created_at FROM vouchers v WHERE v.used_by = u.id ORDER BY v.used_at DESC LIMIT 1) as last_activity
       FROM users u ${where}
       ORDER BY u.${sortCol} ${sortOrder}
       LIMIT ${parseInt(limit)} OFFSET ${offset}`, params
    );

    res.json({
      success: true,
      customers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Customers list error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /customers/stats — Dashboard stats for customer module
router.get('/customers/stats', async (req, res) => {
  try {
    const [total] = await db.execute("SELECT COUNT(*) as c FROM users WHERE role='customer'");
    const [active] = await db.execute("SELECT COUNT(*) as c FROM users WHERE role='customer' AND is_active=1");
    const [suspended] = await db.execute("SELECT COUNT(*) as c FROM users WHERE role='customer' AND is_active=0");
    const [todayNew] = await db.execute("SELECT COUNT(*) as c FROM users WHERE role='customer' AND DATE(created_at)=CURDATE()");
    const [weekNew] = await db.execute("SELECT COUNT(*) as c FROM users WHERE role='customer' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)");
    const [monthNew] = await db.execute("SELECT COUNT(*) as c FROM users WHERE role='customer' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)");
    const [totalRevenue] = await db.execute("SELECT COALESCE(SUM(amount),0) as t FROM clickpesa_transactions WHERE status IN ('SUCCESS','SETTLED')");
    const [arpu] = await db.execute("SELECT COALESCE(AVG(moneyspent),0) as avg FROM users WHERE role='customer' AND moneyspent > 0");
    const [online] = await db.execute("SELECT COUNT(*) as c FROM users WHERE role='customer' AND last_login >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)");

    // Churn (users inactive for 30+ days who were previously active)
    const [churned] = await db.execute(
      "SELECT COUNT(*) as c FROM users WHERE role='customer' AND last_login < DATE_SUB(NOW(), INTERVAL 30 DAY) AND last_login IS NOT NULL AND moneyspent > 0"
    );

    // Package distribution
    const [byPackage] = await db.execute(
      `SELECT u.package as package_name, COUNT(*) as count, COALESCE(SUM(u.moneyspent),0) as revenue
       FROM users u WHERE u.role='customer' GROUP BY u.package ORDER BY count DESC`
    );

    // Growth last 14 days
    const [growth] = await db.execute(
      `SELECT DATE(created_at) as day, COUNT(*) as new_users
       FROM users WHERE role='customer' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
       GROUP BY DATE(created_at) ORDER BY day`
    );

    res.json({
      success: true,
      total: total[0].c, active: active[0].c, suspended: suspended[0].c,
      todayNew: todayNew[0].c, weekNew: weekNew[0].c, monthNew: monthNew[0].c,
      totalRevenue: totalRevenue[0].t, arpu: Math.round(arpu[0].avg),
      onlineNow: online[0].c, churnedUsers: churned[0].c,
      byPackage, growth
    });
  } catch (error) {
    console.error('Customer stats error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /customers/:id — Customer 360° Detail
router.get('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [users] = await db.execute(
      `SELECT u.*, COALESCE(ct_agg.total_spent,0) as total_spent, COALESCE(ct_agg.payment_count,0) as payment_count,
              COALESCE(v_agg.vouchers_used,0) as vouchers_used, COALESCE(v_agg.total_data_mb,0) as total_data_mb
       FROM users u
       LEFT JOIN (SELECT user_id, SUM(amount) as total_spent, COUNT(*) as payment_count
                  FROM clickpesa_transactions WHERE status IN ('SUCCESS','SETTLED') GROUP BY user_id) ct_agg ON u.id = ct_agg.user_id
       LEFT JOIN (SELECT used_by as user_id, COUNT(*) as vouchers_used, COALESCE(SUM(p.data_limit_mb),0) as total_data_mb
                  FROM vouchers v JOIN packages p ON v.package_id = p.id WHERE v.is_used=1 GROUP BY used_by) v_agg ON u.id = v_agg.user_id
       WHERE u.id = ?`, [id]
    );
    if (users.length === 0) return res.status(404).json({ success: false, message: 'Customer not found' });

    const [payments] = await db.execute(
      'SELECT * FROM clickpesa_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [id]
    );
    const [vouchers] = await db.execute(
      `SELECT v.*, p.name as package_name, p.duration_hours, p.data_limit_mb
       FROM vouchers v LEFT JOIN packages p ON v.package_id = p.id
       WHERE v.used_by = ? ORDER BY v.used_at DESC LIMIT 20`, [id]
    );
    const [sessions] = await db.execute(
      'SELECT *, timestamp AS connected_at FROM user_connection_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 20', [id]
    );
    const [devices] = await db.execute(
      'SELECT DISTINCT mac_address, first_seen, last_seen FROM user_devices WHERE user_id = ? ORDER BY last_seen DESC LIMIT 10', [id]
    ).catch(() => [[]]);

    res.json({
      success: true,
      customer: users[0],
      payments, vouchers, sessions,
      devices: devices[0] || []
    });
  } catch (error) {
    console.error('Customer detail error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /customers/:id/adjust — Adjust subscription (extend, grant data, change package)
router.post('/customers/:id/adjust', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, days, data_mb, package_name } = req.body;
    const [users] = await db.execute('SELECT * FROM users WHERE id=? AND role="customer"', [id]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'Customer not found' });

    if (action === 'extend') {
      const addDays = parseInt(days) || 7;
      await db.execute('UPDATE users SET usage_until = DATE_ADD(COALESCE(usage_until, NOW()), INTERVAL ? DAY) WHERE id=?', [addDays, id]);
    } else if (action === 'grant_data') {
      const addMb = parseInt(data_mb) || 100;
      await db.execute('UPDATE users SET free_bytes = COALESCE(free_bytes,0) + (? * 1024 * 1024) WHERE id=?', [addMb, id]);
    } else if (action === 'change_package') {
      await db.execute('UPDATE users SET package = ? WHERE id=?', [package_name || '', id]);
    } else if (action === 'suspend') {
      await db.execute('UPDATE users SET is_active = 0 WHERE id=?', [id]);
    } else if (action === 'activate') {
      await db.execute('UPDATE users SET is_active = 1 WHERE id=?', [id]);
    }

    res.json({ success: true, message: 'Customer updated' });
  } catch (error) {
    console.error('Customer adjust error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// RESELLERS — Tiers, Commissions, Performance
// ═══════════════════════════════════════════════════════════════

// GET /resellers — Enhanced reseller list with performance data
router.get('/resellers', async (req, res) => {
  try {
    const { search = '', status, tier, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = "WHERE u.role = 'reseller'";
    const params = [];
    if (search) { where += ' AND (u.name LIKE ? OR u.phone_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (status === 'active') { where += ' AND u.is_active = 1'; }
    else if (status === 'suspended') { where += ' AND u.is_active = 0'; }
    if (tier) { where += ' AND r.tier = ?'; params.push(tier); }

    const [countResult] = await db.execute(`SELECT COUNT(*) as total FROM users u LEFT JOIN resellers r ON u.id = r.user_id ${where}`, params);
    const total = countResult[0]?.total || 0;

    const [resellers] = await db.execute(
      `SELECT u.id, u.name, u.phone_number, u.email, u.is_active, u.created_at,
              COALESCE(r.balance,0) as balance, COALESCE(r.total_earned,0) as total_earned,
              COALESCE(r.commission_rate,10) as commission_rate, COALESCE(r.tier,'bronze') as tier,
              COALESCE(r.total_vouchers_sold,0) as total_vouchers_sold,
              0 as total_customers,
              r.status as reseller_status,
              (SELECT COUNT(*) FROM voucher_batches vb WHERE vb.created_by = u.id) as batch_count,
              (SELECT COUNT(*) FROM vouchers v JOIN voucher_batches vb ON v.batch_id = vb.id WHERE vb.created_by = u.id AND v.is_used=1) as redeemed_count,
              (SELECT COALESCE(SUM(v.price),0) FROM vouchers v JOIN voucher_batches vb ON v.batch_id = vb.id WHERE vb.created_by = u.id AND v.is_used=1) as revenue_generated
       FROM users u LEFT JOIN resellers r ON u.id = r.user_id ${where}
       ORDER BY revenue_generated DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`, params
    );

    // Summary stats
    const [summary] = await db.execute(
      `SELECT COUNT(*) as total, SUM(CASE WHEN u.is_active=1 THEN 1 ELSE 0 END) as active,
              COALESCE(SUM(r.balance),0) as total_balance, COALESCE(SUM(r.total_earned),0) as total_earned,
              COALESCE(AVG(r.commission_rate),10) as avg_commission,
              (SELECT COALESCE(SUM(v.price),0) FROM vouchers v JOIN voucher_batches vb ON v.batch_id=vb.id JOIN users u2 ON vb.created_by=u2.id WHERE u2.role='reseller' AND v.is_used=1) as total_revenue
       FROM users u LEFT JOIN resellers r ON u.id = r.user_id WHERE u.role='reseller'`
    );

    res.json({
      success: true, resellers,
      summary: summary[0],
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Resellers list error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /resellers/:id — Detailed reseller with performance
router.get('/resellers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [users] = await db.execute(
      `SELECT u.*, COALESCE(r.balance,0) as balance, COALESCE(r.total_earned,0) as total_earned,
              COALESCE(r.commission_rate,10) as commission_rate, COALESCE(r.tier,'bronze') as tier,
              COALESCE(r.total_vouchers_sold,0) as total_vouchers_sold, r.status as reseller_status
       FROM users u LEFT JOIN resellers r ON u.id = r.user_id WHERE u.id=? AND u.role='reseller'`, [id]
    );
    if (users.length === 0) return res.status(404).json({ success: false, message: 'Reseller not found' });

    const [batches] = await db.execute(
      `SELECT vb.*, (SELECT COUNT(*) FROM vouchers WHERE batch_id=vb.id) as total_vouchers,
              (SELECT COUNT(*) FROM vouchers WHERE batch_id=vb.id AND is_used=1) as redeemed
       FROM voucher_batches vb WHERE vb.created_by=? ORDER BY vb.created_at DESC LIMIT 20`, [id]
    );
    const [transactions] = await db.execute(
      'SELECT * FROM transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [id]
    );
    const [recentSales] = await db.execute(
      `SELECT v.voucher_code, v.price, v.used_at, p.name as package_name
       FROM vouchers v JOIN voucher_batches vb ON v.batch_id=vb.id LEFT JOIN packages p ON v.package_id=p.id
       WHERE vb.created_by=? AND v.is_used=1 ORDER BY v.used_at DESC LIMIT 10`, [id]
    );
    // Performance metrics
    const [performance] = await db.execute(
      `SELECT DATE(v.used_at) as day, COUNT(*) as sales, COALESCE(SUM(v.price),0) as revenue
       FROM vouchers v JOIN voucher_batches vb ON v.batch_id=vb.id
       WHERE vb.created_by=? AND v.is_used=1 AND v.used_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(v.used_at) ORDER BY day`, [id]
    );

    res.json({
      success: true, reseller: users[0], batches, transactions, recentSales, performance
    });
  } catch (error) {
    console.error('Reseller detail error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /resellers/:id/tier — Update reseller tier
router.post('/resellers/:id/tier', async (req, res) => {
  try {
    const { id } = req.params;
    const { tier, commission_rate } = req.body;
    const validTiers = ['bronze', 'silver', 'gold', 'platinum'];
    if (tier && !validTiers.includes(tier)) return res.status(400).json({ success: false, message: 'Invalid tier' });

    if (tier) await db.execute('UPDATE resellers SET tier=? WHERE user_id=?', [tier, id]);
    if (commission_rate !== undefined) await db.execute('UPDATE resellers SET commission_rate=? WHERE user_id=?', [parseFloat(commission_rate), id]);

    res.json({ success: true, message: 'Tier updated' });
  } catch (error) {
    console.error('Reseller tier error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /resellers/:id/status — Suspend/reactivate reseller
router.post('/resellers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    await db.execute('UPDATE users SET is_active=? WHERE id=? AND role="reseller"', [is_active ? 1 : 0, id]);
    await db.execute('UPDATE resellers SET status=? WHERE user_id=?', [is_active ? 'active' : 'suspended', id]);
    res.json({ success: true, message: is_active ? 'Reseller activated' : 'Reseller suspended' });
  } catch (error) {
    console.error('Reseller status error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// CAMPAIGNS — Ads, Voucher Campaigns, Conversion Tracking
// ═══════════════════════════════════════════════════════════════

const MARKETING_TYPES = ['social_media','sms','email','radio','tv','flyer','event','referral','other'];

// GET /campaigns — List all campaigns (both legacy ads + modern campaigns)
router.get('/campaigns', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Modern campaigns from campaign tables
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND mc.status = ?'; params.push(status); }
    if (type) { where += ' AND mc.campaign_type = ?'; params.push(type); }

    const [campaigns] = await db.execute(
      `SELECT mc.*, mc.campaign_name as name, u.name as manager_name,
              (SELECT COUNT(*) FROM campaign_completions cc WHERE cc.campaign_id = mc.id) as total_completions,
              (SELECT COUNT(*) FROM campaign_completions cc WHERE cc.campaign_id = mc.id AND cc.lead_status='converted') as completed_count,
              (SELECT COALESCE(SUM(cc.cost_charged),0) FROM campaign_completions cc WHERE cc.campaign_id = mc.id) as actual_spend
       FROM marketing_campaigns mc LEFT JOIN users u ON mc.managed_by = u.id
       WHERE ${where}
       ORDER BY mc.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`, params
    );

    // Ads served to customers (platform + partner campaign ads)
    const [ads] = await db.execute(
      `SELECT a.*, u.name AS sponsor_name, u.company_name,
              (SELECT COUNT(*) FROM ad_views av WHERE av.ad_id = a.id) as view_count,
              (SELECT COUNT(*) FROM ad_views av WHERE av.ad_id = a.id AND av.watched_duration >= a.duration) as completed_views
       FROM ads a
       LEFT JOIN users u ON a.sponsor_id = u.id
       ORDER BY a.created_at DESC LIMIT 50`
    );

    // Partner campaigns (sponsors / bank partners) awaiting approval or running
    const [partnerCampaigns] = await db.execute(
      `SELECT c.*, u.name AS owner_name, u.company_name, u.role AS owner_role,
              cc.content_type, cc.video_url, cc.image_url, cc.duration_seconds,
              (SELECT id FROM ads a WHERE a.campaign_id = c.id LIMIT 1) AS ad_id,
              (SELECT COUNT(*) FROM campaign_completions x WHERE x.campaign_id = c.id) AS total_completions
       FROM campaigns c
       LEFT JOIN users u ON c.owner_id = u.id
       LEFT JOIN campaign_content cc ON cc.campaign_id = c.id
       ORDER BY (c.approved_by IS NULL) DESC, c.created_at DESC LIMIT 100`
    );

    const [countResult] = await db.execute(`SELECT COUNT(*) as total FROM marketing_campaigns mc WHERE ${where}`, params);

    // Summary stats
    const [stats] = await db.execute(
      `SELECT COUNT(*) as total_campaigns,
              SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active,
              SUM(CASE WHEN status='paused' THEN 1 ELSE 0 END) as paused,
              COALESCE(SUM(budget),0) as total_budget,
              COALESCE(SUM(spent),0) as total_spent
       FROM marketing_campaigns`
    );
    const [adStats] = await db.execute(
      `SELECT COUNT(*) as total_ads,
              SUM(CASE WHEN is_active=1 THEN 1 ELSE 0 END) as active,
              (SELECT COUNT(*) FROM ad_views) as total_views,
              (SELECT COUNT(*) FROM ad_views av2 JOIN ads a2 ON av2.ad_id=a2.id WHERE av2.watched_duration >= a2.duration) as completed_views
       FROM ads`
    );

    const [partnerStats] = await db.execute(
      `SELECT COUNT(*) AS partner_campaigns,
              SUM(CASE WHEN approved_by IS NULL THEN 1 ELSE 0 END) AS pending_partner_campaigns,
              SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_partner_campaigns
       FROM campaigns`
    );

    res.json({
      success: true, campaigns, ads, partnerCampaigns,
      stats: { ...stats[0], ...adStats[0], ...partnerStats[0] },
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult[0].total, pages: Math.ceil(countResult[0].total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Campaigns list error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /campaigns — Create marketing campaign
router.post('/campaigns', async (req, res) => {
  try {
    const { name, campaign_name, description, campaign_type, target_audience, budget, start_date, end_date, notes } = req.body;
    const campaignName = (campaign_name || name || '').trim();
    if (!campaignName) return res.status(400).json({ success: false, message: 'Name is required' });

    const type = MARKETING_TYPES.includes(campaign_type) ? campaign_type : 'other';
    const startDate = start_date || new Date().toISOString().slice(0, 10);

    const [result] = await db.execute(
      `INSERT INTO marketing_campaigns (campaign_name, description, campaign_type, target_audience, budget,
       start_date, end_date, status, managed_by, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, NOW())`,
      [campaignName, description || '', type, target_audience || 'all',
       Number(budget) || 0, startDate, end_date || null,
       req.session.admin_user?.id || null, notes || null]
    );
    res.json({ success: true, id: result.insertId, message: 'Campaign created' });
  } catch (error) {
    console.error('Campaign create error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /campaigns/:id — Update campaign
router.put('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = { ...req.body };
    if (fields.name !== undefined && fields.campaign_name === undefined) fields.campaign_name = fields.name;
    if (fields.campaign_type !== undefined && !MARKETING_TYPES.includes(fields.campaign_type)) fields.campaign_type = 'other';
    const allowed = ['campaign_name','description','campaign_type','status','budget','spent','start_date','end_date','target_audience','notes'];
    const updates = []; const vals = [];
    for (const [k,v] of Object.entries(fields)) {
      if (allowed.includes(k)) { updates.push(`${k}=?`); vals.push(v); }
    }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No valid fields' });
    vals.push(id);
    await db.execute(`UPDATE marketing_campaigns SET ${updates.join(',')}, updated_at=NOW() WHERE id=?`, vals);
    res.json({ success: true, message: 'Campaign updated' });
  } catch (error) {
    console.error('Campaign update error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /campaigns/:id/lifecycle — activate/pause/complete/cancel
router.post('/campaigns/:id/lifecycle', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const validActions = { activate: 'active', pause: 'paused', resume: 'active', complete: 'completed', cancel: 'cancelled' };
    if (!validActions[action]) return res.status(400).json({ success: false, message: 'Invalid action' });
    await db.execute('UPDATE marketing_campaigns SET status=?, updated_at=NOW() WHERE id=?', [validActions[action], id]);
    res.json({ success: true, message: `Campaign ${action}d` });
  } catch (error) {
    console.error('Campaign lifecycle error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /ads — Create an ad (admin). Ads created here are approved and active
// immediately because an admin is the approver.
router.post('/ads', async (req, res) => {
  try {
    const {
      title, description, video_url, image_url,
      reward_mb, reward_bytes: rewardBytesInput,
      duration, duration_seconds, sponsor_id, is_active
    } = req.body;

    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    if (!video_url && !image_url) {
      return res.status(400).json({ success: false, message: 'Video URL or Image URL is required' });
    }

    const parsedDuration = parseInt(duration ?? duration_seconds, 10);
    const durationSeconds = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 30;

    const rewardBytes = rewardBytesInput != null
      ? Math.max(0, parseInt(rewardBytesInput, 10) || 0)
      : Math.max(0, Math.round((Number(reward_mb) || 0) * 1024 * 1024));

    const active = is_active === false || is_active === 0 || is_active === '0' ? 0 : 1;

    const [result] = await db.execute(
      `INSERT INTO ads
        (title, description, image_url, video_url, duration, reward_bytes, sponsor_id, approved, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())`,
      [title, description || '', image_url || '', video_url || '', durationSeconds, rewardBytes,
       sponsor_id || null, active]
    );
    res.json({ success: true, id: result.insertId, message: 'Ad created and published' });
  } catch (error) {
    console.error('Ad create error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /ads/:id — Edit an ad or toggle it on/off
router.put('/ads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const updates = [];
    const values = [];

    if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title); }
    if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description || ''); }
    if (body.image_url !== undefined) { updates.push('image_url = ?'); values.push(body.image_url || ''); }
    if (body.video_url !== undefined) { updates.push('video_url = ?'); values.push(body.video_url || ''); }
    if (body.sponsor_id !== undefined) { updates.push('sponsor_id = ?'); values.push(body.sponsor_id || null); }
    if (body.duration !== undefined || body.duration_seconds !== undefined) {
      const parsed = parseInt(body.duration ?? body.duration_seconds, 10);
      if (Number.isFinite(parsed) && parsed > 0) { updates.push('duration = ?'); values.push(parsed); }
    }
    if (body.reward_mb !== undefined || body.reward_bytes !== undefined) {
      const bytes = body.reward_bytes != null
        ? Math.max(0, parseInt(body.reward_bytes, 10) || 0)
        : Math.max(0, Math.round((Number(body.reward_mb) || 0) * 1024 * 1024));
      updates.push('reward_bytes = ?'); values.push(bytes);
    }
    if (body.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(body.is_active === false || body.is_active === 0 || body.is_active === '0' ? 0 : 1);
    }
    if (body.approved !== undefined) {
      updates.push('approved = ?');
      values.push(body.approved === false || body.approved === 0 || body.approved === '0' ? 0 : 1);
    }

    if (!updates.length) return res.status(400).json({ success: false, message: 'No valid fields' });
    values.push(id);
    await db.execute(`UPDATE ads SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    res.json({ success: true, message: 'Ad updated' });
  } catch (error) {
    console.error('Ad update error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// REPORTS & MARKETING — Real Analytics
// ═══════════════════════════════════════════════════════════════

// GET /reports/overview — Business KPIs
router.get('/reports/overview', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const dateFilter = `DATE_SUB(CURDATE(), INTERVAL ${days} DAY)`;

    // Revenue
    const [revenue] = await db.execute(
      `SELECT DATE(created_at) as day, COALESCE(SUM(amount),0) as revenue, COUNT(*) as transactions
       FROM clickpesa_transactions WHERE status IN ('SUCCESS','SETTLED') AND created_at >= ${dateFilter}
       GROUP BY DATE(created_at) ORDER BY day`
    );
    const [totalRevenue] = await db.execute(
      `SELECT COALESCE(SUM(amount),0) as t FROM clickpesa_transactions WHERE status IN ('SUCCESS','SETTLED') AND created_at >= ${dateFilter}`
    );

    // Users
    const [newUsers] = await db.execute(
      `SELECT DATE(created_at) as day, COUNT(*) as count FROM users WHERE role='customer' AND created_at >= ${dateFilter} GROUP BY DATE(created_at) ORDER BY day`
    );
    const [activeUsers] = await db.execute(
      `SELECT COUNT(DISTINCT user_id) as c FROM clickpesa_transactions WHERE status IN ('SUCCESS','SETTLED') AND created_at >= ${dateFilter}`
    );

    // Vouchers
    const [voucherSales] = await db.execute(
      `SELECT DATE(used_at) as day, COUNT(*) as count, COALESCE(SUM(price),0) as revenue
       FROM vouchers WHERE is_used=1 AND used_at >= ${dateFilter} GROUP BY DATE(used_at) ORDER BY day`
    );

    // Top packages
    const [topPackages] = await db.execute(
      `SELECT p.name, COUNT(v.id) as sales, COALESCE(SUM(v.price),0) as revenue
       FROM vouchers v JOIN packages p ON v.package_id=p.id WHERE v.is_used=1 AND v.used_at >= ${dateFilter}
       GROUP BY p.id ORDER BY sales DESC LIMIT 5`
    );

    // Router health
    const [routerStats] = await db.execute(
      `SELECT status, COUNT(*) as count FROM mikrotiks GROUP BY status`
    );

    // Reseller performance
    const [resellerPerf] = await db.execute(
      `SELECT u.name, COALESCE(r.total_earned,0) as earned, COALESCE(r.total_vouchers_sold,0) as sold
       FROM users u JOIN resellers r ON u.id=r.user_id WHERE u.role='reseller' ORDER BY earned DESC LIMIT 5`
    );

    res.json({
      success: true,
      revenue: { data: revenue, total: totalRevenue[0].t },
      users: { newUsers, activeCount: activeUsers[0].c },
      vouchers: voucherSales,
      topPackages, routerStats, resellerPerf,
      period
    });
  } catch (error) {
    console.error('Reports overview error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /reports/financial — Detailed financial report
router.get('/reports/financial', async (req, res) => {
  try {
    const { from, to } = req.query;
    let where = "WHERE status IN ('SUCCESS','SETTLED')";
    const params = [];
    if (from) { where += ' AND created_at >= ?'; params.push(from + ' 00:00:00'); }
    if (to) { where += ' AND created_at <= ?'; params.push(to + ' 23:59:59'); }

    const [daily] = await db.execute(
      `SELECT DATE(created_at) as day, COALESCE(SUM(amount),0) as revenue, COUNT(*) as transactions
       FROM clickpesa_transactions ${where} GROUP BY DATE(created_at) ORDER BY day`, params
    );
    const [byMethod] = await db.execute(
      `SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount),0) as revenue
       FROM clickpesa_transactions ${where} GROUP BY payment_method ORDER BY revenue DESC`, params
    );
    const [byHour] = await db.execute(
      `SELECT HOUR(created_at) as hour, COUNT(*) as count, COALESCE(SUM(amount),0) as revenue
       FROM clickpesa_transactions ${where} GROUP BY HOUR(created_at) ORDER BY hour`, params
    );
    const [total] = await db.execute(
      `SELECT COALESCE(SUM(amount),0) as revenue, COUNT(*) as transactions, COALESCE(AVG(amount),0) as avg_order
       FROM clickpesa_transactions ${where}`, params
    );

    res.json({ success: true, daily, byMethod, byHour, total: total[0] });
  } catch (error) {
    console.error('Financial report error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// APPLICATIONS — Partner Onboarding Pipeline
// ═══════════════════════════════════════════════════════════════

// GET /applications — List with pipeline stages
router.get('/applications', async (req, res) => {
  try {
    const { status, business_type, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND pa.status = ?'; params.push(status); }
    if (business_type) { where += ' AND pa.business_type = ?'; params.push(business_type); }

    const [countResult] = await db.execute(`SELECT COUNT(*) as total FROM partner_applications pa WHERE ${where}`, params);
    const [applications] = await db.execute(
      `SELECT pa.*, u.name as processed_by_name,
              COALESCE(pa.contact_person, pa.full_name) as contact_person,
              COALESCE(pa.phone, pa.phone_number) as phone,
              COALESCE(pa.business_name, pa.full_name) as business_name
       FROM partner_applications pa LEFT JOIN users u ON pa.processed_by = u.id
       WHERE ${where}
       ORDER BY pa.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`, params
    );

    const [stats] = await db.execute(
      `SELECT status, COUNT(*) as count FROM partner_applications GROUP BY status`
    );

    res.json({
      success: true, applications,
      stats: stats.reduce((acc, r) => { acc[r.status] = r.count; return acc; }, {}),
      total: countResult[0].total,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult[0].total, pages: Math.ceil(countResult[0].total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Applications list error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /applications/:id/stage — Move application through pipeline
router.put('/applications/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const validStatuses = ['pending', 'contacted', 'documents_review', 'approved', 'rejected', 'provisioned'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    await db.execute(
      'UPDATE partner_applications SET status=?, notes=COALESCE(?,notes), processed_by=?, processed_at=NOW() WHERE id=?',
      [status, notes, req.session.admin_user?.id || null, id]
    );
    res.json({ success: true, message: `Application moved to ${status}` });
  } catch (error) {
    console.error('Application stage error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /applications/:id/provision — Create account from application
router.post('/applications/:id/provision', async (req, res) => {
  try {
    const { id } = req.params;
    const [apps] = await db.execute('SELECT * FROM partner_applications WHERE id=?', [id]);
    if (apps.length === 0) return res.status(404).json({ success: false, message: 'Application not found' });

    const app = apps[0];
    const role = app.business_type || 'franchise';
    const tempPassword = 'Welcome' + Math.random().toString(36).substr(2, 6) + '!';

    const appEmail = app.email;
    const appPhone = app.phone || app.phone_number;
    const appContact = app.contact_person || app.full_name;

    // Check if user already exists
    const [existing] = await db.execute('SELECT id FROM users WHERE email=? OR phone_number=?', [appEmail, appPhone]);
    if (existing.length > 0) return res.status(400).json({ success: false, message: 'Account already exists for this email/phone' });

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const [result] = await db.execute(
      `INSERT INTO users (name, email, phone_number, password, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [appContact || app.business_name || 'Partner', appEmail, appPhone, hashedPassword, role]
    );

    // Create wallet
    await db.execute('INSERT INTO wallets (user_id, balance, is_active, created_at) VALUES (?, 0, 1, NOW())', [result.insertId]);

    // Create reseller record if applicable
    if (role === 'reseller') {
      await db.execute(
        'INSERT INTO resellers (user_id, balance, total_earned, commission_rate, tier, status, created_at) VALUES (?, 0, 0, 10, "bronze", "active", NOW())',
        [result.insertId]
      );
    }

    // Mark application as provisioned
    await db.execute(
      'UPDATE partner_applications SET status="provisioned", notes=CONCAT(COALESCE(notes,""), "\n[Provisioned] Account created for user ID: ', result.insertId, '"), processed_by=?, processed_at=NOW() WHERE id=?',
      [req.session.admin_user?.id, id]
    );

    res.json({
      success: true, message: 'Account provisioned',
      account: { id: result.insertId, email: app.email, tempPassword, role }
    });
  } catch (error) {
    console.error('Application provision error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PACKAGES — Enhanced with Analytics
// ═══════════════════════════════════════════════════════════════

// GET /packages — Enhanced with sales data per package
router.get('/packages', async (req, res) => {
  try {
    const [packages] = await db.execute(
      `SELECT p.*,
              (SELECT COUNT(*) FROM vouchers v WHERE v.package_id=p.id) as total_vouchers,
              (SELECT COUNT(*) FROM vouchers v WHERE v.package_id=p.id AND v.is_used=1) as redeemed,
              (SELECT COUNT(*) FROM vouchers v WHERE v.package_id=p.id AND v.is_used=0) as available,
              (SELECT COALESCE(SUM(v.price),0) FROM vouchers v WHERE v.package_id=p.id AND v.is_used=1) as revenue,
              (SELECT COUNT(*) FROM vouchers v WHERE v.package_id=p.id AND v.is_used=1 AND v.used_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) as week_sales,
              (SELECT COUNT(*) FROM vouchers v WHERE v.package_id=p.id AND v.is_used=1 AND v.used_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as month_sales
       FROM packages p ORDER BY p.sort_order ASC, p.price ASC`
    );

    // Revenue summary
    const [revTotal] = await db.execute("SELECT COALESCE(SUM(amount),0) as t FROM clickpesa_transactions WHERE status IN ('SUCCESS','SETTLED')");
    const [vouchersTotal] = await db.execute('SELECT COUNT(*) as total, SUM(CASE WHEN is_used=1 THEN 1 ELSE 0 END) as used FROM vouchers');

    res.json({
      success: true, packages,
      summary: { totalRevenue: revTotal[0].t, totalVouchers: vouchersTotal[0].total, usedVouchers: vouchersTotal[0].used }
    });
  } catch (error) {
    console.error('Packages enhanced error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
