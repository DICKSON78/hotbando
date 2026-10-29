'use strict';
// HQ: resellers, router assignments, sales per router.
// The money split itself runs inside payment fulfillment (services/routerSplit.js).
const express = require('express');
const db = require('../config/database');
const router = express.Router();

const actor = (req) => (req.user && req.user.id) || null;
const num = (v) => Number(v || 0);
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

// Builds a full row for INSERT: provided values + safe defaults for NOT NULL columns without a default.
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

// Safe columns only (mikrotiks also holds router credentials and keys).
async function allRouters() {
  const [rows] = await db.execute('SELECT id, router_id, router_name, status, is_active, location_name FROM mikrotiks');
  return rows.map(r => ({
    key: String(r.router_id || r.id), id: r.id, name: r.router_name || null,
    status: r.status || null, is_active: r.is_active, location: r.location_name || null
  }));
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

// Keep the legacy resellers.router_id (mikrotiks.id) pointing at the reseller's newest active router.
async function syncResellerRouter(c, resellerUserId) {
  if (!resellerUserId) return;
  const [a] = await c.execute(
    'SELECT router_id FROM router_assignments WHERE reseller_user_id = ? AND unassigned_at IS NULL ORDER BY assigned_at DESC, id DESC LIMIT 1',
    [resellerUserId]
  );
  let mid = null;
  if (a.length) {
    const [m] = await c.execute('SELECT id FROM mikrotiks WHERE router_id = ? LIMIT 1', [a[0].router_id]);
    mid = m.length ? m[0].id : null;
  }
  await c.execute('UPDATE resellers SET router_id = ? WHERE user_id = ?', [mid, resellerUserId]);
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
      `SELECT u.id, u.name, u.company_name, u.phone_number, u.email, u.is_active,
              r.balance, r.total_earned, r.tier
       FROM users u LEFT JOIN resellers r ON r.user_id = u.id
       WHERE u.role = 'reseller' ORDER BY u.id DESC`
    );
    const act = await activeAssignments();
    res.json({
      resellers: rs.map(u => ({
        ...u, balance: num(u.balance), total_earned: num(u.total_earned),
        routers: act.filter(a => a.reseller_user_id === u.id).map(a => ({
          router_id: a.router_id, display_name: a.display_name, commission_percent: num(a.commission_percent)
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
    const [dup] = await db.execute('SELECT id FROM users WHERE phone_number = ? LIMIT 1', [phone]);
    if (dup.length) return res.status(409).json({ error: 'A user with this phone already exists' });
    if (email) {
      const [de] = await db.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
      if (de.length) return res.status(409).json({ error: 'A user with this email already exists' });
    }
    let bcrypt;
    try { bcrypt = require('bcryptjs'); } catch (_) { bcrypt = require('bcrypt'); }
    const hash = await bcrypt.hash(password, 10);

    const id = await withTx(async (c) => {
      const uid = await insertRow(c, 'users', {
        name, phone_number: phone, email, company_name: company, password: hash,
        role: 'reseller', is_active: 1, is_verified: 1
      });
      await insertRow(c, 'resellers', {
        user_id: uid, balance: 0, total_earned: 0, status: 'active', tier: 'bronze',
        total_vouchers_sold: 0, total_customers: 0, created_at: new Date()
      });
      return uid;
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
    const rawPct = req.body.commission_percent;
    const pct = (rawPct === undefined || rawPct === null || rawPct === '') ? 20 : toPct(rawPct);
    const rename = req.body.rename_router === true || req.body.rename_router === 'true';
    if (!rid || !Number.isInteger(resellerId) || resellerId <= 0) return res.status(400).json({ error: 'router_id and reseller_user_id are required' });
    if (display.length < 2 || display.length > 80) return res.status(400).json({ error: 'Router name must be 2-80 characters' });
    if (pct === null) return res.status(400).json({ error: 'HQ percent must be between 0 and 100' });

    const target = (await allRouters()).find(r => r.key === rid);
    if (!target) return res.status(404).json({ error: 'Unknown router_id' });
    const [u] = await db.execute("SELECT id FROM users WHERE id = ? AND role = 'reseller' AND is_active = 1 LIMIT 1", [resellerId]);
    if (!u.length) return res.status(404).json({ error: 'Active reseller not found' });

    await withTx(async (c) => {
      const [old] = await c.execute('SELECT reseller_user_id FROM router_assignments WHERE router_id = ? AND unassigned_at IS NULL FOR UPDATE', [rid]);
      await c.execute('UPDATE router_assignments SET unassigned_at = NOW(), unassigned_by = ? WHERE router_id = ? AND unassigned_at IS NULL', [actor(req), rid]);
      await c.execute(
        'INSERT INTO router_assignments (router_id, reseller_user_id, display_name, commission_percent, assigned_by) VALUES (?,?,?,?,?)',
        [rid, resellerId, display, pct, actor(req)]
      );
      if (rename) await c.execute('UPDATE mikrotiks SET router_name = ? WHERE router_id = ?', [display, rid]);
      await c.execute("UPDATE reseller_financings SET router_id = ?, status = 'active', started_at = COALESCE(started_at, NOW()) WHERE reseller_user_id = ? AND status IN ('pending','active') AND router_id IS NULL", [rid, resellerId]);
      const touched = new Set([resellerId, ...old.map(o => o.reseller_user_id)]);
      for (const uid of touched) await syncResellerRouter(c, uid);
    });
    if (rename) console.log("[resellers-v2] router " + rid + " renamed '" + target.name + "' -> '" + display + "'");
    res.status(201).json({ success: true, renamed: rename, previous_name: target.name });
  } catch (e) {
    console.error('resellers-v2 assign error:', e);
    res.status(500).json({ error: 'Failed to assign router', code: e.code, detail: e.sqlMessage });
  }
});

router.post('/unassign', async (req, res) => {
  try {
    const rid = String(req.body.router_id || '').trim();
    if (!rid) return res.status(400).json({ error: 'router_id is required' });
    const closed = await withTx(async (c) => {
      const [old] = await c.execute('SELECT reseller_user_id FROM router_assignments WHERE router_id = ? AND unassigned_at IS NULL FOR UPDATE', [rid]);
      const [r] = await c.execute('UPDATE router_assignments SET unassigned_at = NOW(), unassigned_by = ? WHERE router_id = ? AND unassigned_at IS NULL', [actor(req), rid]);
      for (const o of old) await syncResellerRouter(c, o.reseller_user_id);
      return r.affectedRows;
    });
    res.json({ success: true, closed });
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

router.get('/sales', async (req, res) => {
  try {
    const f = []; const v = [];
    if (req.query.from) { f.push('created_at >= ?'); v.push(String(req.query.from)); }
    if (req.query.to) { f.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)'); v.push(String(req.query.to)); }
    const where = "WHERE status = 'credited'" + (f.length ? ' AND ' + f.join(' AND ') : '');
    const agg = 'COUNT(*) AS sales, COALESCE(SUM(gross_amount),0) AS gross, COALESCE(SUM(hq_amount),0) AS hq, COALESCE(SUM(reseller_amount),0) AS reseller';

    const [[tot]] = await db.execute(`SELECT ${agg} FROM router_sales ${where}`, v);
    const [perRouter] = await db.execute(`SELECT router_id, ${agg} FROM router_sales ${where} GROUP BY router_id`, v);
    const [perReseller] = await db.execute(`SELECT reseller_user_id, ${agg} FROM router_sales ${where} AND reseller_user_id IS NOT NULL GROUP BY reseller_user_id`, v);
    const [recent] = await db.execute(
      `SELECT order_reference, router_id, reseller_user_id, gross_amount, hq_percent, hq_amount, reseller_amount, created_at
       FROM router_sales ${where} ORDER BY created_at DESC LIMIT 30`, v
    );

    const routers = await allRouters();
    const act = await activeAssignments();
    const [rs] = await db.execute(
      "SELECT u.id, u.name, u.company_name, r.balance, r.total_earned FROM users u LEFT JOIN resellers r ON r.user_id = u.id WHERE u.role = 'reseller'"
    );
    const rMap = new Map(perRouter.map(r => [r.router_id, r]));
    const aMap = new Map(act.map(a => [a.router_id, a]));
    const uMap = new Map(rs.map(u => [u.id, u]));
    const pack = (x) => ({ sales: num(x && x.sales), gross: num(x && x.gross), hq: num(x && x.hq), reseller: num(x && x.reseller) });

    res.json({
      totals: pack(tot),
      byRouter: routers.map(r => {
        const a = aMap.get(r.key);
        return { router_id: r.key, router_name: r.name, display_name: a ? a.display_name : null,
                 reseller_name: a ? (a.company_name || a.reseller_name) : null, hq_percent: a ? num(a.commission_percent) : 100,
                 ...pack(rMap.get(r.key)) };
      }),
      byReseller: perReseller.map(x => {
        const u = uMap.get(x.reseller_user_id) || {};
        return { reseller_user_id: x.reseller_user_id, name: u.company_name || u.name || ('#' + x.reseller_user_id),
                 balance: num(u.balance), total_earned: num(u.total_earned), ...pack(x) };
      }),
      recent: recent.map(r => ({ ...r, gross_amount: num(r.gross_amount), hq_amount: num(r.hq_amount), reseller_amount: num(r.reseller_amount), hq_percent: num(r.hq_percent) }))
    });
  } catch (e) {
    console.error('resellers-v2 sales error:', e);
    res.status(500).json({ error: 'Failed to load sales', code: e.code });
  }
});

module.exports = router;
