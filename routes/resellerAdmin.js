'use strict';
// HQ: resellers, router assignments, assignment history.
// Money split / vouchers / withdrawals are separate phases.
const express = require('express');
const db = require('../config/database');
const router = express.Router();

const colCache = {};
async function cols(table) {
  if (!colCache[table]) {
    const [r] = await db.execute(
      'SELECT COLUMN_NAME AS c FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?',
      [table]
    );
    colCache[table] = new Set(r.map(x => x.c));
  }
  return colCache[table];
}

const routerKey = (r) => String(r.router_id || r.identity || r.router_identity || r.mikrotik_id || r.name || r.id);
const actor = (req) => (req.user && req.user.id) || null;
const toPct = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) / 100 : null; };
const normPhone = (p) => {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '255' + d.slice(1);
  return /^255\d{9}$/.test(d) ? d : null;
};

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

// Safe subset only (mikrotiks may hold API credentials).
async function allRouters() {
  const [rows] = await db.execute('SELECT * FROM mikrotiks');
  return rows.map(r => ({ key: routerKey(r), id: r.id, name: r.name || null, status: r.status || null, is_active: r.is_active }));
}

async function activeAssignments() {
  const [rows] = await db.execute(
    `SELECT a.id, a.router_id, a.reseller_user_id, a.display_name, a.commission_percent, a.assigned_at,
            u.name AS reseller_name, u.company_name, u.phone_number
     FROM router_assignments a LEFT JOIN users u ON u.id = a.reseller_user_id
     WHERE a.unassigned_at IS NULL`
  );
  return rows;
}

// Used by later phases: which reseller owned this router at a given time?
async function getActiveAssignment(rid, at) {
  const when = at ? new Date(at) : new Date();
  const [rows] = await db.execute(
    `SELECT * FROM router_assignments
     WHERE router_id = ? AND assigned_at <= ? AND (unassigned_at IS NULL OR unassigned_at > ?)
     ORDER BY assigned_at DESC LIMIT 1`,
    [rid, when, when]
  );
  return rows[0] || null;
}

router.get('/routers', async (req, res) => {
  try {
    const [routers, act] = await Promise.all([allRouters(), activeAssignments()]);
    const byRouter = new Map(act.map(a => [a.router_id, a]));
    res.json({ routers: routers.map(r => ({ ...r, assignment: byRouter.get(r.key) || null })) });
  } catch (e) {
    console.error('resellers-v2 routers error:', e);
    res.status(500).json({ error: 'Failed to load routers', code: e.code });
  }
});

router.get('/overview', async (req, res) => {
  try {
    const [rs] = await db.execute(
      "SELECT id, name, company_name, phone_number, email, is_active FROM users WHERE role = 'reseller' ORDER BY id DESC"
    );
    const act = await activeAssignments();
    res.json({
      resellers: rs.map(u => ({
        ...u,
        routers: act.filter(a => a.reseller_user_id === u.id).map(a => ({
          router_id: a.router_id, display_name: a.display_name,
          commission_percent: Number(a.commission_percent), assigned_at: a.assigned_at
        }))
      }))
    });
  } catch (e) {
    console.error('resellers-v2 overview error:', e);
    res.status(500).json({ error: 'Failed to load resellers', code: e.code });
  }
});

router.post('/resellers', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const company = String(req.body.company_name || '').trim() || null;
    const email = String(req.body.email || '').trim() || null;
    const phone = normPhone(req.body.phone);
    const password = String(req.body.password || '');
    if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Name must be 2-100 characters' });
    if (!phone) return res.status(400).json({ error: 'Phone must look like 2557XXXXXXXX or 07XXXXXXXX' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const uc = await cols('users');
    const pwCol = ['password', 'password_hash'].find(c => uc.has(c));
    if (!pwCol) return res.status(500).json({ error: 'users table has no password column I recognise' });
    let bcrypt;
    try { bcrypt = require('bcryptjs'); } catch (_) { bcrypt = require('bcrypt'); }

    const [dup] = await db.execute('SELECT id FROM users WHERE phone_number = ? LIMIT 1', [phone]);
    if (dup.length) return res.status(409).json({ error: 'A user with this phone already exists' });

    const hash = await bcrypt.hash(password, 10);
    const row = { name, phone_number: phone, email, company_name: company, role: 'reseller', is_active: 1, [pwCol]: hash };
    const keys = Object.keys(row).filter(k => uc.has(k));
    const id = await withTx(async (c) => {
      const [r] = await c.execute(
        `INSERT INTO users (${keys.map(k => '`' + k + '`').join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
        keys.map(k => row[k])
      );
      await c.execute('INSERT INTO resellers (user_id) VALUES (?)', [r.insertId]);
      return r.insertId;
    });
    res.status(201).json({ success: true, id });
  } catch (e) {
    console.error('resellers-v2 create error:', e);
    res.status(500).json({ error: 'Failed to create reseller', code: e.code, detail: e.sqlMessage });
  }
});

router.post('/assign', async (req, res) => {
  try {
    const rid = String(req.body.router_id || '').trim();
    const resellerId = Number(req.body.reseller_user_id);
    const display = String(req.body.display_name || '').trim();
    const pct = req.body.commission_percent === undefined ? 20 : toPct(req.body.commission_percent);
    if (!rid || !Number.isInteger(resellerId)) return res.status(400).json({ error: 'router_id and reseller_user_id are required' });
    if (display.length < 2 || display.length > 80) return res.status(400).json({ error: 'display_name must be 2-80 characters' });
    if (pct === null) return res.status(400).json({ error: 'commission_percent must be 0-100 (percent HQ keeps)' });

    const [u] = await db.execute("SELECT id FROM users WHERE id = ? AND role = 'reseller' AND is_active = 1 LIMIT 1", [resellerId]);
    if (!u.length) return res.status(404).json({ error: 'Active reseller not found' });
    const routers = await allRouters();
    if (!routers.some(r => r.key === rid)) {
      return res.status(404).json({ error: 'Unknown router_id', known: routers.map(r => r.key) });
    }

    await withTx(async (c) => {
      await c.execute('UPDATE router_assignments SET unassigned_at = NOW(), unassigned_by = ? WHERE router_id = ? AND unassigned_at IS NULL', [actor(req), rid]);
      await c.execute(
        'INSERT INTO router_assignments (router_id, reseller_user_id, display_name, commission_percent, assigned_by) VALUES (?,?,?,?,?)',
        [rid, resellerId, display, pct, actor(req)]
      );
    });
    res.status(201).json({ success: true });
  } catch (e) {
    console.error('resellers-v2 assign error:', e);
    res.status(500).json({ error: 'Failed to assign router', code: e.code, detail: e.sqlMessage });
  }
});

router.post('/unassign', async (req, res) => {
  try {
    const rid = String(req.body.router_id || '').trim();
    if (!rid) return res.status(400).json({ error: 'router_id is required' });
    const [r] = await db.execute('UPDATE router_assignments SET unassigned_at = NOW(), unassigned_by = ? WHERE router_id = ? AND unassigned_at IS NULL', [actor(req), rid]);
    res.json({ success: true, closed: r.affectedRows });
  } catch (e) {
    console.error('resellers-v2 unassign error:', e);
    res.status(500).json({ error: 'Failed to unassign router', code: e.code });
  }
});

router.get('/history/:router_id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT a.id, a.router_id, a.display_name, a.commission_percent, a.assigned_at, a.unassigned_at,
              u.name AS reseller_name, u.company_name
       FROM router_assignments a LEFT JOIN users u ON u.id = a.reseller_user_id
       WHERE a.router_id = ? ORDER BY a.assigned_at DESC`,
      [String(req.params.router_id)]
    );
    res.json({ history: rows });
  } catch (e) {
    console.error('resellers-v2 history error:', e);
    res.status(500).json({ error: 'Failed to load history', code: e.code });
  }
});

module.exports = router;
module.exports.getActiveAssignment = getActiveAssignment;
