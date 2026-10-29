'use strict';
// HQ: review applications, create reseller accounts, schedule installs, equipment partners/plans, financing.
// Mounted under /api/admin/resellers-v2 (admin auth is applied by routes/admin.js).
const express = require('express');
const db = require('../config/database');
const router = express.Router();

const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const num = (v) => Number(v || 0);
const pct = (v, def = null) => {
  if (v === undefined || v === null || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) / 100 : NaN;
};
const money = (v) => {
  const n = Number(v === '' || v == null ? 0 : v);
  return Number.isFinite(n) && n >= 0 && n <= 1e10 ? Math.round(n * 100) / 100 : NaN;
};
const idOf = (req) => { const n = Number(req.params.id); return Number.isInteger(n) && n > 0 ? n : null; };
const fail = (res, e, what) => { console.error('onboarding ' + what + ':', e); res.status(500).json({ error: 'Failed: ' + what, code: e.code }); };

async function withTx(fn) {
  if (typeof db.getConnection !== 'function') return fn(db);
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const r = await fn(c);
    await c.commit();
    return r;
  } catch (e) {
    try { await c.rollback(); } catch (_) {}
    throw e;
  } finally { c.release(); }
}

async function buildRow(table, provided) {
  const [info] = await db.execute(
    'SELECT COLUMN_NAME AS c, IS_NULLABLE AS n, COLUMN_DEFAULT AS d, EXTRA AS e, DATA_TYPE AS t, COLUMN_TYPE AS ct FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?',
    [table]
  );
  const row = {};
  for (const col of info) {
    if (/auto_increment|generated/i.test(col.e || '')) continue;
    if (Object.prototype.hasOwnProperty.call(provided, col.c)) { row[col.c] = provided[col.c]; continue; }
    if (col.n === 'NO' && col.d === null) {
      if (/int|decimal|float|double|bit/i.test(col.t)) row[col.c] = 0;
      else if (/date|time/i.test(col.t)) row[col.c] = new Date();
      else if (col.t === 'enum') { const m = /enum\('([^']*)'/.exec(col.ct || ''); row[col.c] = m ? m[1] : ''; }
      else if (col.t === 'json') row[col.c] = '{}';
      else row[col.c] = '';
    }
  }
  return row;
}
async function insertRow(c, table, provided) {
  const row = await buildRow(table, provided);
  const keys = Object.keys(row);
  const [r] = await c.execute(
    'INSERT INTO `' + table + '` (' + keys.map(k => '`' + k + '`').join(',') + ') VALUES (' + keys.map(() => '?').join(',') + ')',
    keys.map(k => row[k])
  );
  return r.insertId;
}

// ---------------- Applications ----------------
router.get('/applications', async (req, res) => {
  try {
    const st = String(req.query.status || '');
    const valid = ['new', 'reviewing', 'approved', 'scheduled', 'installed', 'rejected'];
    const where = valid.includes(st) ? 'WHERE a.status = ?' : '';
    const [rows] = await db.execute(
      `SELECT a.id, a.application_ref, a.name, a.business_name, a.phone, a.email, a.region, a.district, a.ward, a.address, a.landmark,
              a.business_type, a.expected_customers, a.plan_id, a.notes, a.status, a.rejection_reason, a.admin_notes, a.user_id,
              DATE_FORMAT(a.install_date, '%Y-%m-%d') AS install_date, a.install_time, a.technician, a.install_notes, a.created_at,
              p.name AS plan_name, p.plan_type
       FROM reseller_applications a LEFT JOIN equipment_plans p ON p.id = a.plan_id
       ${where} ORDER BY a.created_at DESC LIMIT 300`,
      where ? [st] : []
    );
    const [counts] = await db.execute('SELECT status, COUNT(*) AS n FROM reseller_applications GROUP BY status');
    res.json({ applications: rows, counts: Object.fromEntries(counts.map(c => [c.status, Number(c.n)])) });
  } catch (e) { fail(res, e, 'applications list'); }
});

router.post('/applications/:id/review', async (req, res) => {
  try {
    const id = idOf(req); if (!id) return res.status(400).json({ error: 'Invalid id' });
    const note = str(req.body && req.body.notes, 500);
    const [r] = await db.execute(
      `UPDATE reseller_applications
       SET status = 'reviewing', admin_notes = ${note ? "CONCAT_WS('\\n', admin_notes, ?)" : 'admin_notes'}
       WHERE id = ? AND status IN ('new','reviewing')`,
      note ? [note, id] : [id]
    );
    if (!r.affectedRows) return res.status(409).json({ error: 'Application not found or already processed' });
    res.json({ success: true });
  } catch (e) { fail(res, e, 'review'); }
});

router.post('/applications/:id/reject', async (req, res) => {
  try {
    const id = idOf(req); if (!id) return res.status(400).json({ error: 'Invalid id' });
    const reason = str(req.body && req.body.reason, 500);
    if (reason.length < 3) return res.status(400).json({ error: 'Give a reason (shown to the applicant)' });
    const [r] = await db.execute(
      "UPDATE reseller_applications SET status = 'rejected', rejection_reason = ? WHERE id = ? AND status IN ('new','reviewing')", [reason, id]
    );
    if (!r.affectedRows) return res.status(409).json({ error: 'Cannot reject: not found or already processed' });
    res.json({ success: true });
  } catch (e) { fail(res, e, 'reject'); }
});

router.post('/applications/:id/approve', async (req, res) => {
  try {
    const id = idOf(req); if (!id) return res.status(400).json({ error: 'Invalid id' });
    const body = req.body || {};
    const out = await withTx(async (c) => {
      const [rows] = await c.execute('SELECT * FROM reseller_applications WHERE id = ? FOR UPDATE', [id]);
      if (!rows.length) return { code: 404, error: 'Application not found' };
      const a = rows[0];
      if (!['new', 'reviewing'].includes(a.status)) return { code: 409, error: 'Application is already ' + a.status };
      const plus = '+' + a.phone;
      const [du] = await c.execute('SELECT id FROM users WHERE phone_number IN (?, ?) OR email = ? LIMIT 1', [a.phone, plus, a.email]);
      if (du.length) return { code: 409, error: 'A user with this phone or email already exists' };

      let planId = a.plan_id;
      if (body.plan_id !== undefined && body.plan_id !== '' && body.plan_id !== null) planId = Number(body.plan_id);
      let plan = null;
      if (planId) {
        const [p] = await c.execute('SELECT * FROM equipment_plans WHERE id = ? AND is_active = 1', [planId]);
        if (!p.length) return { code: 400, error: 'Plan not found or inactive' };
        plan = p[0];
      }

      const uid = await insertRow(c, 'users', {
        name: a.name, phone_number: plus, email: a.email, password: a.password_hash, company_name: a.business_name,
        role: 'reseller', is_active: 1, is_verified: 1
      });
      await insertRow(c, 'resellers', {
        user_id: uid, balance: 0, total_earned: 0, status: 'active', tier: 'bronze', total_vouchers_sold: 0, total_customers: 0, created_at: new Date()
      });

      let financingId = null;
      if (plan && plan.plan_type === 'financed' && Number(plan.financed_amount) > 0) {
        const [f] = await c.execute(
          "INSERT INTO reseller_financings (application_id, reseller_user_id, plan_id, partner_id, principal, balance, repayment_percent, maintenance_percent, status) VALUES (?,?,?,?,?,?,?,?, 'pending')",
          [a.id, uid, plan.id, plan.partner_id, plan.financed_amount, plan.financed_amount, plan.repayment_percent, plan.maintenance_percent]
        );
        financingId = f.insertId;
      }
      await c.execute(
        "UPDATE reseller_applications SET status = 'approved', user_id = ?, plan_id = ?, rejection_reason = NULL WHERE id = ?",
        [uid, plan ? plan.id : null, a.id]
      );
      return { ok: true, user_id: uid, financing_id: financingId, login_email: a.email };
    });
    if (out.error) return res.status(out.code).json({ error: out.error });
    res.json({ success: true, ...out });
  } catch (e) { fail(res, e, 'approve'); }
});

router.post('/applications/:id/schedule', async (req, res) => {
  try {
    const id = idOf(req); if (!id) return res.status(400).json({ error: 'Invalid id' });
    const b = req.body || {};
    const date = str(b.install_date, 10);
    const time = str(b.install_time, 20);
    const tech = str(b.technician, 100);
    const notes = str(b.notes, 500) || null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return res.status(400).json({ error: 'Pick a valid install date' });
    if (!time) return res.status(400).json({ error: 'Enter the install time' });
    if (tech.length < 2) return res.status(400).json({ error: 'Enter the technician name' });
    const [r] = await db.execute(
      "UPDATE reseller_applications SET status = 'scheduled', install_date = ?, install_time = ?, technician = ?, install_notes = ? WHERE id = ? AND status IN ('approved','scheduled') AND user_id IS NOT NULL",
      [date, time, tech, notes, id]
    );
    if (!r.affectedRows) return res.status(409).json({ error: 'Approve the application first' });
    const [a] = await db.execute('SELECT name, phone, application_ref FROM reseller_applications WHERE id = ?', [id]);
    const base = process.env.APP_URL || 'https://hotbandowifi.online';
    const message = `Habari ${a[0].name}, ombi lako la HotBando (${a[0].application_ref}) limeidhinishwa. Ufungaji wa vifaa umepangwa tarehe ${date} saa ${time}, fundi: ${tech}.` +
      (notes ? ` ${notes}.` : '') + ` Ingia kuona maelezo: ${base}/reseller/application`;
    res.json({ success: true, message, whatsapp_link: `https://wa.me/${a[0].phone}?text=${encodeURIComponent(message)}` });
  } catch (e) { fail(res, e, 'schedule'); }
});

router.post('/applications/:id/installed', async (req, res) => {
  try {
    const id = idOf(req); if (!id) return res.status(400).json({ error: 'Invalid id' });
    const out = await withTx(async (c) => {
      const [rows] = await c.execute("SELECT user_id FROM reseller_applications WHERE id = ? AND status IN ('approved','scheduled') FOR UPDATE", [id]);
      if (!rows.length || !rows[0].user_id) return { code: 409, error: 'Application must be approved or scheduled first' };
      await c.execute("UPDATE reseller_applications SET status = 'installed' WHERE id = ?", [id]);
      const [f] = await c.execute("UPDATE reseller_financings SET status = 'active', started_at = NOW() WHERE reseller_user_id = ? AND status = 'pending'", [rows[0].user_id]);
      return { ok: true, financing_activated: f.affectedRows };
    });
    if (out.error) return res.status(out.code).json({ error: out.error });
    res.json({ success: true, ...out, next: 'Now assign the router on the Reseller Routers page' });
  } catch (e) { fail(res, e, 'installed'); }
});

// ---------------- Partners and plans ----------------
router.get('/partners', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, name, contact_person, phone, email, notes, is_active FROM equipment_partners ORDER BY name');
    res.json({ partners: rows });
  } catch (e) { fail(res, e, 'partners list'); }
});

router.post('/partners', async (req, res) => {
  try {
    const b = req.body || {};
    const name = str(b.name, 150);
    if (name.length < 2) return res.status(400).json({ error: 'Partner name is required' });
    const [r] = await db.execute(
      'INSERT INTO equipment_partners (name, contact_person, phone, email, notes) VALUES (?,?,?,?,?)',
      [name, str(b.contact_person, 150) || null, str(b.phone, 30) || null, str(b.email, 190) || null, str(b.notes, 1000) || null]
    );
    res.status(201).json({ success: true, id: r.insertId });
  } catch (e) { fail(res, e, 'partner create'); }
});

router.get('/plans', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT p.*, ep.name AS partner_name FROM equipment_plans p LEFT JOIN equipment_partners ep ON ep.id = p.partner_id ORDER BY p.is_active DESC, p.id DESC`
    );
    res.json({ plans: rows.map(r => ({ ...r, total_price: num(r.total_price), deposit: num(r.deposit), financed_amount: num(r.financed_amount),
      repayment_percent: num(r.repayment_percent), maintenance_percent: num(r.maintenance_percent) })) });
  } catch (e) { fail(res, e, 'plans list'); }
});

router.post('/plans', async (req, res) => {
  try {
    const b = req.body || {};
    const name = str(b.name, 150);
    const type = String(b.plan_type || '');
    if (name.length < 2) return res.status(400).json({ error: 'Plan name is required' });
    if (!['hq_supplied', 'outright', 'financed'].includes(type)) return res.status(400).json({ error: 'Invalid plan type' });
    let partnerId = null;
    if (type !== 'hq_supplied') {
      partnerId = Number(b.partner_id);
      if (!Number.isInteger(partnerId) || partnerId <= 0) return res.status(400).json({ error: 'Select a partner for this plan' });
      const [p] = await db.execute('SELECT id FROM equipment_partners WHERE id = ? AND is_active = 1', [partnerId]);
      if (!p.length) return res.status(404).json({ error: 'Partner not found' });
    }
    const total = money(b.total_price);
    const deposit = money(b.deposit);
    if (Number.isNaN(total) || Number.isNaN(deposit) || deposit > total) return res.status(400).json({ error: 'Check price and deposit (deposit cannot exceed price)' });
    const financed = type === 'financed' ? Math.round((total - deposit) * 100) / 100 : 0;
    const repay = type === 'financed' ? pct(b.repayment_percent, NaN) : 0;
    if (type === 'financed' && (!(repay > 0) || !(financed > 0))) {
      return res.status(400).json({ error: 'A financed plan needs an amount to finance and a repayment percent above 0' });
    }
    const maint = pct(b.maintenance_percent, 10);
    if (Number.isNaN(maint)) return res.status(400).json({ error: 'Maintenance percent must be 0-100' });
    const [r] = await db.execute(
      'INSERT INTO equipment_plans (partner_id, name, plan_type, equipment_list, total_price, deposit, financed_amount, repayment_percent, maintenance_percent) VALUES (?,?,?,?,?,?,?,?,?)',
      [partnerId, name, type, str(b.equipment_list, 2000) || null, total, deposit, financed, repay, maint]
    );
    res.status(201).json({ success: true, id: r.insertId });
  } catch (e) { fail(res, e, 'plan create'); }
});

router.post('/plans/:id/toggle', async (req, res) => {
  try {
    const id = idOf(req); if (!id) return res.status(400).json({ error: 'Invalid id' });
    const [r] = await db.execute('UPDATE equipment_plans SET is_active = 1 - is_active WHERE id = ?', [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Plan not found' });
    res.json({ success: true });
  } catch (e) { fail(res, e, 'plan toggle'); }
});

// ---------------- Financing ----------------
router.get('/financings', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT f.id, f.status, f.principal, f.balance, f.repayment_percent, f.maintenance_percent, f.router_id, f.started_at, f.completed_at,
              u.name AS reseller_name, u.company_name, ep.name AS partner_name, p.name AS plan_name,
              (SELECT MAX(r.created_at) FROM financing_repayments r WHERE r.financing_id = f.id) AS last_repayment
       FROM reseller_financings f
       LEFT JOIN users u ON u.id = f.reseller_user_id
       LEFT JOIN equipment_partners ep ON ep.id = f.partner_id
       LEFT JOIN equipment_plans p ON p.id = f.plan_id
       ORDER BY f.id DESC LIMIT 200`
    );
    res.json({ financings: rows.map(r => ({ ...r, principal: num(r.principal), balance: num(r.balance), repaid: num(r.principal) - num(r.balance),
      repayment_percent: num(r.repayment_percent), maintenance_percent: num(r.maintenance_percent) })) });
  } catch (e) { fail(res, e, 'financings list'); }
});

router.post('/financings/:id/activate', async (req, res) => {
  try {
    const id = idOf(req); if (!id) return res.status(400).json({ error: 'Invalid id' });
    const [r] = await db.execute("UPDATE reseller_financings SET status = 'active', started_at = NOW() WHERE id = ? AND status = 'pending'", [id]);
    if (!r.affectedRows) return res.status(409).json({ error: 'Financing not found or not pending' });
    res.json({ success: true });
  } catch (e) { fail(res, e, 'financing activate'); }
});

router.get('/partner-balances', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT ep.id, ep.name,
         COALESCE((SELECT SUM(r.amount) FROM financing_repayments r JOIN reseller_financings f ON f.id = r.financing_id WHERE f.partner_id = ep.id), 0) AS collected,
         COALESCE((SELECT SUM(x.amount) FROM partner_payouts x WHERE x.partner_id = ep.id), 0) AS paid
       FROM equipment_partners ep ORDER BY ep.name`
    );
    const [payouts] = await db.execute(
      'SELECT x.id, x.partner_id, ep.name AS partner_name, x.amount, x.reference, x.note, x.paid_at FROM partner_payouts x LEFT JOIN equipment_partners ep ON ep.id = x.partner_id ORDER BY x.id DESC LIMIT 30'
    );
    res.json({
      partners: rows.map(r => ({ id: r.id, name: r.name, collected: num(r.collected), paid: num(r.paid), owed: Math.round((num(r.collected) - num(r.paid)) * 100) / 100 })),
      payouts: payouts.map(p => ({ ...p, amount: num(p.amount) }))
    });
  } catch (e) { fail(res, e, 'partner balances'); }
});

router.post('/partner-payouts', async (req, res) => {
  try {
    const b = req.body || {};
    const partnerId = Number(b.partner_id);
    const amount = money(b.amount);
    if (!Number.isInteger(partnerId) || partnerId <= 0 || !(amount > 0)) return res.status(400).json({ error: 'Partner and a positive amount are required' });
    const [[row]] = await db.execute(
      `SELECT COALESCE((SELECT SUM(r.amount) FROM financing_repayments r JOIN reseller_financings f ON f.id = r.financing_id WHERE f.partner_id = ?), 0) -
              COALESCE((SELECT SUM(x.amount) FROM partner_payouts x WHERE x.partner_id = ?), 0) AS owed`, [partnerId, partnerId]
    );
    if (amount > num(row.owed) + 0.001) return res.status(400).json({ error: 'Amount exceeds what is owed to this partner (' + num(row.owed) + ')' });
    await db.execute('INSERT INTO partner_payouts (partner_id, amount, reference, note) VALUES (?,?,?,?)',
      [partnerId, amount, str(b.reference, 100) || null, str(b.note, 500) || null]);
    res.status(201).json({ success: true });
  } catch (e) { fail(res, e, 'partner payout'); }
});

// ---------------- Resellers page: list, show, edit, delete ----------------
const normPhoneR = (p) => {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '255' + d.slice(1);
  return /^255[67]\d{8}$/.test(d) ? d : null;
};
const phoneVariants = (p) => [p, '+' + p, '0' + p.slice(3)];
const adminId = (req) => (req.user && req.user.id) || null;

router.get('/managed', async (req, res) => {
  try {
    const [rs] = await db.execute(
      `SELECT u.id, u.name, u.company_name, u.phone_number, u.email, u.is_active, u.created_at,
              r.balance, r.total_earned, r.status AS reseller_status
       FROM users u LEFT JOIN resellers r ON r.user_id = u.id
       WHERE u.role = 'reseller' ORDER BY u.id DESC LIMIT 500`
    );
    const [apps] = await db.execute(
      `SELECT a.user_id, a.application_ref, a.status, a.region, a.district, a.ward, a.landmark,
              DATE_FORMAT(a.install_date, '%Y-%m-%d') AS install_date, a.install_time, a.technician,
              p.id AS plan_id, p.name AS plan_name, p.plan_type, p.maintenance_percent, p.total_price, p.financed_amount, p.repayment_percent
       FROM reseller_applications a LEFT JOIN equipment_plans p ON p.id = a.plan_id
       WHERE a.user_id IS NOT NULL ORDER BY a.id`
    );
    const [asg] = await db.execute('SELECT router_id, reseller_user_id, display_name, commission_percent FROM router_assignments WHERE unassigned_at IS NULL');
    const [fin] = await db.execute("SELECT reseller_user_id, id, status, principal, balance, repayment_percent, maintenance_percent, router_id FROM reseller_financings WHERE status IN ('pending','active') ORDER BY id");
    const [sales] = await db.execute("SELECT reseller_user_id, COUNT(*) AS sales, COALESCE(SUM(gross_amount),0) AS gross, COALESCE(SUM(reseller_amount),0) AS earned FROM router_sales WHERE status = 'credited' AND reseller_user_id IS NOT NULL GROUP BY reseller_user_id");
    const appBy = new Map(apps.map(a => [a.user_id, a]));
    const finBy = new Map(fin.map(f => [f.reseller_user_id, f]));
    const saleBy = new Map(sales.map(s => [s.reseller_user_id, s]));
    res.json({
      resellers: rs.map(u => {
        const a = appBy.get(u.id) || null;
        const f = finBy.get(u.id) || null;
        const s = saleBy.get(u.id) || null;
        return {
          id: u.id, name: u.name, company_name: u.company_name, phone: u.phone_number, email: u.email, created_at: u.created_at,
          is_active: !!u.is_active,
          status: (u.is_active && u.reseller_status !== 'suspended') ? 'active' : 'suspended',
          balance: num(u.balance), total_earned: num(u.total_earned),
          application: a && { ref: a.application_ref, status: a.status, region: a.region, district: a.district, ward: a.ward, landmark: a.landmark, install_date: a.install_date, install_time: a.install_time, technician: a.technician },
          plan: a && a.plan_id ? { id: a.plan_id, name: a.plan_name, plan_type: a.plan_type, maintenance_percent: num(a.maintenance_percent), total_price: num(a.total_price), financed_amount: num(a.financed_amount), repayment_percent: num(a.repayment_percent) } : null,
          financing: f && { id: f.id, status: f.status, principal: num(f.principal), balance: num(f.balance), repaid: num(f.principal) - num(f.balance), repayment_percent: num(f.repayment_percent), maintenance_percent: num(f.maintenance_percent), router_id: f.router_id },
          routers: asg.filter(x => x.reseller_user_id === u.id).map(x => ({ router_id: x.router_id, display_name: x.display_name, commission_percent: num(x.commission_percent) })),
          sales: s ? { count: Number(s.sales), gross: num(s.gross), earned: num(s.earned) } : { count: 0, gross: 0, earned: 0 }
        };
      })
    });
  } catch (e) { fail(res, e, 'managed list'); }
});

router.get('/managed/:id', async (req, res) => {
  try {
    const id = idOf(req); if (!id) return res.status(400).json({ error: 'Invalid id' });
    const [u] = await db.execute("SELECT id, name, company_name, phone_number, email, is_active, created_at FROM users WHERE id = ? AND role = 'reseller' LIMIT 1", [id]);
    if (!u.length) return res.status(404).json({ error: 'Reseller not found' });
    const [apps] = await db.execute(
      `SELECT a.application_ref, a.status, a.business_type, a.expected_customers, a.region, a.district, a.ward, a.address, a.landmark,
              DATE_FORMAT(a.install_date, '%Y-%m-%d') AS install_date, a.install_time, a.technician, a.install_notes, a.admin_notes, a.created_at,
              p.name AS plan_name, p.plan_type
       FROM reseller_applications a LEFT JOIN equipment_plans p ON p.id = a.plan_id WHERE a.user_id = ? ORDER BY a.id DESC LIMIT 1`, [id]);
    const [fins] = await db.execute(
      `SELECT f.id, f.status, f.principal, f.balance, f.repayment_percent, f.maintenance_percent, f.router_id, f.started_at, f.completed_at, ep.name AS partner_name
       FROM reseller_financings f LEFT JOIN equipment_partners ep ON ep.id = f.partner_id WHERE f.reseller_user_id = ? ORDER BY f.id DESC`, [id]);
    const [reps] = await db.execute(
      `SELECT r.order_reference, r.amount, r.balance_after, r.created_at FROM financing_repayments r
       JOIN reseller_financings f ON f.id = r.financing_id WHERE f.reseller_user_id = ? ORDER BY r.id DESC LIMIT 10`, [id]);
    const [sales] = await db.execute(
      'SELECT order_reference, router_id, gross_amount, hq_percent, hq_amount, repayment_amount, reseller_amount, created_at FROM router_sales WHERE reseller_user_id = ? ORDER BY id DESC LIMIT 10', [id]);
    const [routers] = await db.execute(
      'SELECT router_id, display_name, commission_percent, assigned_at FROM router_assignments WHERE reseller_user_id = ? AND unassigned_at IS NULL', [id]);
    const [wd] = await db.execute('SELECT id, amount, payment_method, status, requested_at FROM reseller_withdrawals WHERE user_id = ? ORDER BY id DESC LIMIT 10', [id]);
    const [rr] = await db.execute('SELECT balance, total_earned, status FROM resellers WHERE user_id = ? LIMIT 1', [id]);
    res.json({
      reseller: { ...u[0], is_active: !!u[0].is_active, balance: num(rr[0] && rr[0].balance), total_earned: num(rr[0] && rr[0].total_earned), reseller_status: rr[0] ? rr[0].status : null },
      application: apps[0] || null,
      financings: fins.map(f => ({ ...f, principal: num(f.principal), balance: num(f.balance), repayment_percent: num(f.repayment_percent), maintenance_percent: num(f.maintenance_percent) })),
      repayments: reps.map(r => ({ ...r, amount: num(r.amount), balance_after: num(r.balance_after) })),
      sales: sales.map(s => ({ ...s, gross_amount: num(s.gross_amount), hq_amount: num(s.hq_amount), repayment_amount: num(s.repayment_amount), reseller_amount: num(s.reseller_amount), hq_percent: num(s.hq_percent) })),
      routers: routers.map(r => ({ ...r, commission_percent: num(r.commission_percent) })),
      withdrawals: wd.map(w => ({ ...w, amount: num(w.amount) }))
    });
  } catch (e) { fail(res, e, 'managed detail'); }
});

router.post('/resellers/:id/update', async (req, res) => {
  try {
    const id = idOf(req); if (!id) return res.status(400).json({ error: 'Invalid id' });
    const b = req.body || {};
    const [u] = await db.execute("SELECT id FROM users WHERE id = ? AND role = 'reseller' LIMIT 1", [id]);
    if (!u.length) return res.status(404).json({ error: 'Reseller not found' });
    const sets = []; const vals = []; let status = null;
    if (b.name !== undefined) {
      const v = str(b.name, 100);
      if (v.length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters' });
      sets.push('name = ?'); vals.push(v);
    }
    if (b.company_name !== undefined) { sets.push('company_name = ?'); vals.push(str(b.company_name, 150) || null); }
    if (b.email !== undefined) {
      const v = str(b.email, 190).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return res.status(400).json({ error: 'Invalid email' });
      const [d] = await db.execute('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [v, id]);
      if (d.length) return res.status(409).json({ error: 'Another user already has this email' });
      sets.push('email = ?'); vals.push(v);
    }
    if (b.phone !== undefined) {
      const p = normPhoneR(b.phone);
      if (!p) return res.status(400).json({ error: 'Phone must look like 2557XXXXXXXX or 07XXXXXXXX' });
      const pv = phoneVariants(p);
      const [d] = await db.execute('SELECT id FROM users WHERE phone_number IN (?, ?, ?) AND id <> ? LIMIT 1', [...pv, id]);
      if (d.length) return res.status(409).json({ error: 'Another user already has this phone' });
      sets.push('phone_number = ?'); vals.push('+' + p);
    }
    if (b.password) {
      const pw = String(b.password);
      if (pw.length < 8 || pw.length > 72) return res.status(400).json({ error: 'Password must be 8-72 characters' });
      let bcrypt; try { bcrypt = require('bcryptjs'); } catch (_) { bcrypt = require('bcrypt'); }
      sets.push('password = ?'); vals.push(await bcrypt.hash(pw, 10));
    }
    if (b.status !== undefined) {
      if (!['active', 'suspended'].includes(b.status)) return res.status(400).json({ error: 'Status must be active or suspended' });
      status = b.status; sets.push('is_active = ?'); vals.push(status === 'active' ? 1 : 0);
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    await withTx(async (c) => {
      await c.execute('UPDATE users SET ' + sets.join(', ') + ' WHERE id = ?', [...vals, id]);
      if (status) await c.execute('UPDATE resellers SET status = ? WHERE user_id = ?', [status, id]);
    });
    console.log('[resellers-v2] reseller ' + id + ' updated by admin ' + adminId(req) + ' (' + sets.map(x => x.split(' ')[0]).join(',') + ')');
    res.json({ success: true });
  } catch (e) { fail(res, e, 'reseller update'); }
});

router.post('/resellers/:id/delete', async (req, res) => {
  try {
    const id = idOf(req); if (!id) return res.status(400).json({ error: 'Invalid id' });
    const out = await withTx(async (c) => {
      const [u] = await c.execute("SELECT id, name FROM users WHERE id = ? AND role = 'reseller' FOR UPDATE", [id]);
      if (!u.length) return { code: 404, error: 'Reseller not found' };
      const blockers = [];
      const count = async (label, sql) => {
        const [r] = await c.execute(sql, [id]);
        if (Number(r[0].n) > 0) blockers.push(label + ' (' + r[0].n + ')');
      };
      await count('router assignments', 'SELECT COUNT(*) AS n FROM router_assignments WHERE reseller_user_id = ?');
      await count('sales', 'SELECT COUNT(*) AS n FROM router_sales WHERE reseller_user_id = ?');
      await count('financing', 'SELECT COUNT(*) AS n FROM reseller_financings WHERE reseller_user_id = ?');
      await count('withdrawals', 'SELECT COUNT(*) AS n FROM reseller_withdrawals WHERE user_id = ?');
      await count('wallet transactions', 'SELECT COUNT(*) AS n FROM transactions WHERE user_id = ?');
      await count('wallet balance', 'SELECT COUNT(*) AS n FROM wallets WHERE user_id = ? AND COALESCE(balance, 0) <> 0');
      await count('reseller balance', 'SELECT COUNT(*) AS n FROM resellers WHERE user_id = ? AND COALESCE(balance, 0) <> 0');
      if (blockers.length) return { code: 409, error: 'Cannot delete, has history: ' + blockers.join(', ') + '. Suspend the reseller instead.' };
      await c.execute("UPDATE reseller_applications SET user_id = NULL, status = 'rejected', rejection_reason = 'Account removed by HQ' WHERE user_id = ?", [id]);
      await c.execute('DELETE FROM wallets WHERE user_id = ?', [id]);
      await c.execute('DELETE FROM resellers WHERE user_id = ?', [id]);
      await c.execute('DELETE FROM users WHERE id = ?', [id]);
      return { ok: true, name: u[0].name };
    });
    if (out.error) return res.status(out.code).json({ error: out.error });
    console.log('[resellers-v2] reseller ' + id + ' (' + out.name + ') deleted by admin ' + adminId(req));
    res.json({ success: true });
  } catch (e) {
    if (e && (e.code === 'ER_ROW_IS_REFERENCED_2' || e.code === 'ER_ROW_IS_REFERENCED')) {
      return res.status(409).json({ error: 'Cannot delete: other records still refer to this user. Suspend the reseller instead.' });
    }
    fail(res, e, 'reseller delete');
  }
});

module.exports = router;
