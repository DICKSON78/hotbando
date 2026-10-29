'use strict';
// What a logged-in reseller sees about their own application, equipment plan and repayments.
const express = require('express');
const db = require('../config/database');
const router = express.Router();
const num = (v) => Number(v || 0);

router.use((req, res, next) => {
  const s = req.session && req.session.reseller_user;
  const id = s && (s.id || s.user_id);
  if (!id) return res.status(401).json({ error: 'Authentication required' });
  req.resellerId = Number(id);
  next();
});

router.get('/my-application', async (req, res) => {
  try {
    const uid = req.resellerId;
    const [apps] = await db.execute(
      `SELECT a.application_ref, a.status, a.region, a.district, a.ward, a.address, a.landmark, a.created_at,
              DATE_FORMAT(a.install_date, '%Y-%m-%d') AS install_date, a.install_time, a.technician, a.install_notes,
              p.name AS plan_name, p.plan_type, p.equipment_list
       FROM reseller_applications a LEFT JOIN equipment_plans p ON p.id = a.plan_id
       WHERE a.user_id = ? ORDER BY a.id DESC LIMIT 1`, [uid]
    );
    const [fin] = await db.execute(
      `SELECT f.id, f.status, f.principal, f.balance, f.repayment_percent, f.maintenance_percent, f.started_at, f.completed_at,
              ep.name AS partner_name
       FROM reseller_financings f LEFT JOIN equipment_partners ep ON ep.id = f.partner_id
       WHERE f.reseller_user_id = ? ORDER BY f.id DESC LIMIT 1`, [uid]
    );
    const [routers] = await db.execute(
      'SELECT router_id, display_name, commission_percent FROM router_assignments WHERE reseller_user_id = ? AND unassigned_at IS NULL', [uid]
    );
    let repayments = [];
    if (fin.length) {
      const [r] = await db.execute(
        'SELECT order_reference, amount, balance_after, created_at FROM financing_repayments WHERE financing_id = ? ORDER BY id DESC LIMIT 10', [fin[0].id]
      );
      repayments = r.map(x => ({ ...x, amount: num(x.amount), balance_after: num(x.balance_after) }));
    }
    const f = fin[0] || null;
    res.json({
      application: apps[0] || null,
      financing: f && { ...f, principal: num(f.principal), balance: num(f.balance), repaid: num(f.principal) - num(f.balance),
                        repayment_percent: num(f.repayment_percent), maintenance_percent: num(f.maintenance_percent) },
      routers: routers.map(r => ({ ...r, commission_percent: num(r.commission_percent) })),
      repayments
    });
  } catch (e) {
    console.error('reseller-portal my-application error:', e);
    res.status(500).json({ error: 'Failed to load application' });
  }
});

module.exports = router;
