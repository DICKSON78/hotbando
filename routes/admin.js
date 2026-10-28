const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const { adminRateLimit } = require('../middleware/adminRateLimit');
const db = require('../config/database');

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

module.exports = router;
