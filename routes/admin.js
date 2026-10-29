const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const { adminRateLimit } = require('../middleware/adminRateLimit');
const db = require('../config/database');
const clickpesaController = require('../controllers/clickpesaController');
const walletController = require('../controllers/walletController');

// Use admin middleware for all routes except specific public ones
router.use(authenticate, requireRole('admin', 'super_admin'), adminRateLimit);

const getFilterClause = (filters) => {
  const clauses = [];
  const params = [];
  if (filters.business_id) { clauses.push('business_id = ?'); params.push(filters.business_id); }
  if (filters.partner_id) { clauses.push('partner_id = ?'); params.push(filters.partner_id); }
  if (filters.status) { clauses.push('status = ?'); params.push(filters.status); }
  if (filters.type) { clauses.push('type = ?'); params.push(filters.type); }
  if (filters.from) { clauses.push('created_at >= ?'); params.push(filters.from); }
  if (filters.to) { clauses.push('created_at <= ?'); params.push(filters.to); }
  return { clause: clauses.length ? 'AND ' + clauses.join(' AND ') : '', params };
};

router.get('/payments/ledger', async (req, res) => {
  try {
    const { business_id, partner_id, status, type, from, to } = req.query;
    const { clause, params } = getFilterClause({ business_id, partner_id, status, type, from, to });
    const [rows] = await db.execute(
      `SELECT * FROM payments WHERE 1=1 ${clause} ORDER BY created_at DESC LIMIT 1000`,
      params
    );
    const [totals] = await db.execute(
      `SELECT type, status, currency, COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM payments WHERE 1=1 ${clause} GROUP BY type, status, currency`,
      params
    );
    res.json({ success: true, payments: rows, totals });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Provider callbacks are kept as a separate audit trail to avoid counting a
// settled callback a second time alongside its actual ledger payment.
router.get('/payments/webhook-events', async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [events] = await db.execute(
      `SELECT id, provider, event_type, provider_ref, order_reference,
              status, error_message, received_at, processed_at,
              COALESCE(
                JSON_UNQUOTE(JSON_EXTRACT(raw_payload, '$.data.collectedAmount')),
                JSON_UNQUOTE(JSON_EXTRACT(raw_payload, '$.data.amount')),
                JSON_UNQUOTE(JSON_EXTRACT(raw_payload, '$.collectedAmount')),
                JSON_UNQUOTE(JSON_EXTRACT(raw_payload, '$.amount'))
              ) AS reported_amount
       FROM payment_events WHERE provider = 'clickpesa'
       ORDER BY received_at DESC LIMIT ${limit}`,
      []
    );
    res.json({ events });
  } catch (error) {
    console.error('ClickPesa webhook audit error:', error);
    res.status(500).json({ error: 'Failed to load ClickPesa webhook audit' });
  }
});

// Unified payment and wallet ledger consumed by the Vue Payments page.
const ledgerSql = `
  SELECT CONCAT('payment-', p.id) AS id, p.created_at,
         COALESCE(NULLIF(p.payment_method, ''), 'payment') AS source,
         u.name AS user_name, u.company_name AS business_name, u.role AS user_role,
         u.phone_number AS phone, CONCAT('PAY-', p.id) AS reference,
         COALESCE(pkg.name, 'Package payment') AS purpose, p.amount,
         'inflow' AS direction, LOWER(p.status) AS status, p.status AS raw_status
  FROM payments p
  LEFT JOIN users u ON u.id = p.user_id
  LEFT JOIN packages pkg ON pkg.id = p.package_id
  UNION ALL
  SELECT CONCAT('transaction-', t.id), t.created_at,
         CASE WHEN t.transaction_type = 'withdrawal' THEN 'withdrawal'
              WHEN t.transaction_type = 'revenue_share' THEN 'revenue_share' ELSE 'wallet' END,
         u.name, u.company_name, u.role, u.phone_number,
         COALESCE(t.payment_reference, CONCAT('TXN-', t.id)),
         COALESCE(NULLIF(t.description, ''), REPLACE(t.transaction_type, '_', ' ')), t.amount,
         CASE WHEN t.transaction_type IN ('withdrawal', 'campaign_charge', 'revenue_share') THEN 'outflow' ELSE 'inflow' END,
         LOWER(t.status), t.status
  FROM transactions t
  LEFT JOIN users u ON u.id = t.user_id
  UNION ALL
  SELECT CONCAT('clickpesa-', c.id), c.created_at, 'clickpesa',
         u.name, u.company_name, u.role, COALESCE(u.phone_number, c.phone),
         c.order_reference, COALESCE(NULLIF(c.purpose, ''), 'ClickPesa payment'), c.amount,
         'inflow',
         CASE WHEN UPPER(c.status) IN ('SUCCESS', 'SETTLED', 'COMPLETED') THEN 'completed'
              WHEN UPPER(c.status) IN ('PENDING', 'PROCESSING') THEN 'pending' ELSE 'failed' END,
         c.status
  FROM clickpesa_transactions c
  LEFT JOIN users u ON u.id = c.user_id
  WHERE c.processed = 0
  UNION ALL
  SELECT CONCAT('share-', s.id), s.created_at, 'revenue_share',
         u.name, u.company_name, u.role, u.phone_number,
         COALESCE(s.payment_reference, CONCAT('SHARE-', s.id)), 'Partner revenue share', s.share_amount,
         'outflow',
         CASE WHEN s.status = 'paid' THEN 'completed' WHEN s.status IN ('pending', 'approved') THEN 'pending' ELSE 'failed' END,
         s.status
  FROM partner_revenue_shares s
  LEFT JOIN users u ON u.id = s.partner_id
  UNION ALL
  SELECT CONCAT('invoice-', i.id), i.created_at, 'invoice',
         u.name, u.company_name, u.role, u.phone_number,
         i.invoice_number, 'Bank partner invoice', i.total_amount,
         'inflow',
         CASE WHEN i.status = 'paid' THEN 'completed' WHEN i.status IN ('draft', 'sent') THEN 'pending' ELSE 'failed' END,
         i.status
  FROM invoices i
  LEFT JOIN users u ON u.id = i.user_id
`;

router.get('/payments', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const filters = [];
    const values = [];
    if (req.query.from) { filters.push('created_at >= ?'); values.push(req.query.from); }
    if (req.query.to) { filters.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)'); values.push(req.query.to); }
    if (req.query.source && req.query.source !== 'all') { filters.push('source = ?'); values.push(req.query.source); }
    if (req.query.status && req.query.status !== 'all') { filters.push('status = ?'); values.push(req.query.status); }
    if (req.query.role && req.query.role !== 'all') { filters.push('user_role = ?'); values.push(req.query.role); }
    if (req.query.q) {
      filters.push('(user_name LIKE ? OR business_name LIKE ? OR phone LIKE ? OR reference LIKE ? OR purpose LIKE ?)');
      const term = `%${String(req.query.q).slice(0, 100)}%`;
      values.push(term, term, term, term, term);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const ledger = `SELECT * FROM (${ledgerSql}) AS ledger ${where}`;
    const [[countRow]] = await db.execute(`SELECT COUNT(*) AS total FROM (${ledger}) AS filtered`, values);
    const [rows] = await db.execute(
      `${ledger} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      values
    );
    const [[summaryRow]] = await db.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'completed' AND direction = 'inflow' THEN amount ELSE 0 END), 0) AS inflow,
        COALESCE(SUM(CASE WHEN status = 'completed' AND direction = 'outflow' THEN amount ELSE 0 END), 0) AS outflow,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_amount,
        SUM(status = 'pending') AS pending_count,
        SUM(status = 'failed') AS failed_count,
        COUNT(*) AS total_count
      FROM (${ledger}) AS filtered
    `, values);
    const [sourceRows] = await db.execute(`
      SELECT source, COUNT(*) AS count,
        COALESCE(SUM(CASE WHEN direction = 'inflow' AND status = 'completed' THEN amount ELSE 0 END), 0) AS inflow,
        COALESCE(SUM(CASE WHEN direction = 'outflow' AND status = 'completed' THEN amount ELSE 0 END), 0) AS outflow,
        SUM(status = 'pending') AS pending
      FROM (${ledger}) AS filtered GROUP BY source ORDER BY source
    `, values);
    const [accounts] = await db.execute(`
      SELECT u.id, u.name, u.company_name, u.phone_number, u.email, u.role,
             w.balance AS wallet_balance, r.balance AS reseller_balance, r.tier,
             COALESCE(t.inflow, 0) AS ledger_inflow, COALESCE(t.outflow, 0) AS ledger_outflow,
             COALESCE(t.pending, 0) AS ledger_pending, t.last_activity
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      LEFT JOIN resellers r ON r.user_id = u.id
      LEFT JOIN (
        SELECT user_id,
          SUM(CASE WHEN status = 'completed' AND transaction_type NOT IN ('withdrawal', 'campaign_charge', 'revenue_share') THEN amount ELSE 0 END) AS inflow,
          SUM(CASE WHEN status = 'completed' AND transaction_type IN ('withdrawal', 'campaign_charge', 'revenue_share') THEN amount ELSE 0 END) AS outflow,
          SUM(status = 'pending') AS pending, MAX(created_at) AS last_activity
        FROM transactions GROUP BY user_id
      ) t ON t.user_id = u.id
      WHERE u.role IN ('reseller', 'sponsor', 'bank_partner', 'franchise_owner', 'admin', 'super_admin')
      ORDER BY COALESCE(u.company_name, u.name)
      LIMIT 1000
    `);
    const summary = {
      ...summaryRow,
      inflow: Number(summaryRow.inflow || 0),
      outflow: Number(summaryRow.outflow || 0),
      net: Number(summaryRow.inflow || 0) - Number(summaryRow.outflow || 0),
      pending_amount: Number(summaryRow.pending_amount || 0),
      pending_count: Number(summaryRow.pending_count || 0),
      failed_count: Number(summaryRow.failed_count || 0),
      total_count: Number(summaryRow.total_count || 0)
    };
    res.json({
      payments: rows,
      bySource: sourceRows.map(row => ({ ...row, inflow: Number(row.inflow), outflow: Number(row.outflow), count: Number(row.count), pending: Number(row.pending || 0) })),
      accounts: accounts.map(account => ({
        ...account,
        wallet_balance: Number(account.wallet_balance || 0),
        reseller_balance: account.reseller_balance == null ? null : Number(account.reseller_balance),
        ledger: { inflow: Number(account.ledger_inflow || 0), outflow: Number(account.ledger_outflow || 0), pending: Number(account.ledger_pending || 0), last_activity: account.last_activity }
      })),
      summary,
      pagination: { page, limit, total: Number(countRow.total || 0), pages: Math.max(1, Math.ceil(Number(countRow.total || 0) / limit)) }
    });
  } catch (error) {
    console.error('Admin payments ledger error:', error);
    res.status(500).json({ error: 'Failed to load payments ledger' });
  }
});

router.get('/clickpesa-balance', clickpesaController.getBalance);

router.get('/withdrawals', async (req, res) => {
  try {
    const page = Math.min(1000000, Math.max(1, parseInt(req.query.page, 10) || 1));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = req.query.status || 'pending';
    const where = ["t.transaction_type = 'withdrawal'"];
    const values = [];
    if (status !== 'all') { where.push('t.status = ?'); values.push(status); }
    const condition = where.join(' AND ');
    const [[countRow]] = await db.execute(`SELECT COUNT(*) AS total FROM transactions t WHERE ${condition}`, values);
    // MySQL prepared execution on the production server rejects placeholders
    // in LIMIT/OFFSET (ER_WRONG_ARGUMENTS). Both values are parsed/clamped
    // integers above, so interpolate only these safe numeric values.
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(`
      SELECT t.id, t.user_id, t.amount, t.payment_phone, t.payment_method, t.payment_reference,
             t.status, t.created_at, COALESCE(u.name, CONCAT('User #', t.user_id)) AS user_name,
             u.phone_number, u.email, u.company_name
      FROM transactions t LEFT JOIN users u ON u.id = t.user_id
      WHERE ${condition} ORDER BY t.created_at DESC LIMIT ${limit} OFFSET ${offset}
    `, values);
    const pagination = { page, limit, total: Number(countRow.total || 0), pages: Math.max(1, Math.ceil(Number(countRow.total || 0) / limit)) };
    res.json({ success: true, data: rows, withdrawals: rows, pagination });
  } catch (error) {
    console.error('Admin withdrawals error:', error);
    res.status(500).json({ error: 'Failed to load withdrawals' });
  }
});

router.get('/withdrawal-stats', async (_req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT status, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total,
             SUM(DATE(created_at) = CURDATE()) AS today_count,
             COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN amount ELSE 0 END), 0) AS today_total
      FROM transactions WHERE transaction_type = 'withdrawal' GROUP BY status
    `);
    const stats = { pending: { count: 0, total: 0 }, completed: { count: 0, total: 0 }, today: { count: 0, total: 0 }, total: { count: 0, total: 0 } };
    for (const row of rows) {
      const count = Number(row.count || 0);
      const total = Number(row.total || 0);
      stats.total.count += count;
      stats.total.total += total;
      stats.today.count += Number(row.today_count || 0);
      stats.today.total += Number(row.today_total || 0);
      if (stats[row.status]) {
        stats[row.status].count = count;
        stats[row.status].total = total;
      }
    }
    res.json(stats);
  } catch (error) {
    console.error('Admin withdrawal stats error:', error);
    res.status(500).json({ error: 'Failed to load withdrawal stats' });
  }
});

router.post('/withdrawals/:id/:action(approve|reject)', (req, res) => {
  req.params.transaction_id = req.params.id;
  req.body.status = req.params.action === 'approve' ? 'completed' : 'failed';
  return walletController.processWithdrawal(req, res);
});

module.exports = router;
