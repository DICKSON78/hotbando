/**
 * Zero-Touch Router Provisioning — public endpoints a fresh MikroTik calls.
 *
 * Two-phase flow controlled by the OWNER:
 *
 *   POST /api/zero-touch/register   — router phones home; server registers it
 *                                     as PENDING (reserves WG IP + keys) and
 *                                     returns a light "wait & poll" script.
 *   GET  /api/zero-touch/provision/:routerID — serves the FULL provisioning
 *                                     script ONLY once an admin pressed CONNECT;
 *                                     pending routers get the wait script.
 *   POST /api/zero-touch/heartbeat  — hourly check-in; server records liveness
 *                                     and can trigger config refresh.
 *
 * Secured by ROUTER_REGISTRATION_SECRET (falls back to RADIUS_SECRET).
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { registerRouter, provisionRouter, generateBootstrapScript: genBootScript, ROUTER_REGISTRATION_SECRET } = require('../utils/routerProvision');
const db = require('../config/database');
const logger = require('../utils/logger');
const mikrotikService = require('../utils/mikrotik');

// Base URL the routers themselves use to reach this server (proven by the
// heartbeat they already send every 2 minutes).
const REPAIR_SCRIPT_BASE_URL = (process.env.PUBLIC_BASE_URL || process.env.APP_URL || 'https://hotbandowifi.online').replace(/\/+$/, '');

// ── Remote repair delivery ─────────────────────────────────────────────────
// A file data/router-repairs/<ROUTER_ID>.rsc is applied to that router via the
// RouterOS API the next time it heartbeats. The file rename acts as a
// cross-process lock (PM2 cluster = several processes share this directory):
//   <id>.rsc       pending, will be applied on the next heartbeat
//   <id>.applying  locked while a process is applying it
//   <id>.applied   done (kept for audit)
//   <id>.failed    gave up after 3 attempts (kept for diagnosis)
const REPAIR_DIR = path.join(__dirname, '..', 'data', 'router-repairs');
const repairInFlight = new Set();
const MAX_REPAIR_ATTEMPTS = 3;

function repairFilePath(safeId, suffix) {
    return path.join(REPAIR_DIR, `${safeId}.${suffix}`);
}

// Lightweight per-router progress log (appended, capped) so the operator can
// see exactly where a remote repair is stuck without SSH access to the server.
function repairLog(safeId, msg) {
    try {
        const logPath = repairFilePath(safeId, 'log');
        let lines = [];
        try { lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean); } catch (e) {}
        lines.push(`${new Date().toISOString()} ${msg}`);
        fs.writeFileSync(logPath, lines.slice(-30).join('\n') + '\n');
    } catch (e) { /* diagnostics must never break the repair */ }
}

function restorePendingRepair(safeId, reason) {
    const attemptsPath = repairFilePath(safeId, 'attempts');
    let attempts = 0;
    try { attempts = parseInt(String(fs.readFileSync(attemptsPath, 'utf8')).trim() || '0', 10) || 0; } catch (e) {}
    attempts += 1;
    try {
        fs.writeFileSync(repairFilePath(safeId, 'error'), `${new Date().toISOString()} attempt ${attempts}: ${reason}`);
        if (attempts >= MAX_REPAIR_ATTEMPTS) {
            fs.renameSync(repairFilePath(safeId, 'applying'), repairFilePath(safeId, 'failed'));
            logger.error('Router repair failed permanently', { router: safeId, attempts, reason });
        } else {
            fs.writeFileSync(attemptsPath, String(attempts));
            fs.renameSync(repairFilePath(safeId, 'applying'), repairFilePath(safeId, 'rsc'));
            logger.warn('Router repair failed, retrying on next heartbeat', { router: safeId, attempts, reason });
        }
    } catch (e) {
        logger.error('Router repair state update failed', { router: safeId, error: e.message });
    }
}

// One-time, short-lived tokens so a router can download its repair script.
// The router fetches the URL itself (/tool fetch), exactly like it does for
// the heartbeat and provision scripts. Tokens are stored on DISK (not in
// memory) so any process in the PM2 cluster can serve them.
const repairScriptTokens = new Map();

function issueRepairToken(safeId) {
    const token = crypto.randomBytes(24).toString('hex');
    try {
        fs.writeFileSync(
            repairFilePath(safeId, 'token'),
            JSON.stringify({ token, expires: Date.now() + 15 * 60 * 1000 })
        );
    } catch (e) { /* the in-memory lookup below still works for this process */ }
    repairScriptTokens.set(token, { safeId, expires: Date.now() + 15 * 60 * 1000 });
    return token;
}

function findRepairToken(token) {
    const entry = repairScriptTokens.get(token);
    if (entry && entry.expires >= Date.now()) return entry.safeId;
    try {
        for (const name of fs.readdirSync(REPAIR_DIR)) {
            if (!name.endsWith('.token')) continue;
            const safeId = name.slice(0, -'.token'.length);
            let data = null;
            try { data = JSON.parse(fs.readFileSync(repairFilePath(safeId, 'token'), 'utf8')); } catch (e) { continue; }
            if (data && data.token === token) {
                if (data.expires < Date.now()) return null;
                return safeId;
            }
        }
    } catch (e) { /* directory unreadable */ }
    return null;
}

function consumeRepairToken(token, safeId) {
    repairScriptTokens.delete(token);
    try { fs.unlinkSync(repairFilePath(safeId, 'token')); } catch (e) { /* ignore */ }
}

// Fetch+import can legitimately take a while; never let it hang the state.
const REPAIR_APPLY_TIMEOUT_MS = 180000;

function withRepairTimeout(promise) {
    let timer;
    const timeout = new Promise((resolve) => {
        timer = setTimeout(() => resolve('timeout'), REPAIR_APPLY_TIMEOUT_MS);
        if (timer.unref) timer.unref();
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Fire-and-forget so the heartbeat response never waits on a router repair.
function maybeApplyRouterRepair(routerID) {
    if (!routerID || repairInFlight.has(routerID)) return;
    const safeId = String(routerID).replace(/[^A-Za-z0-9._-]/g, '');
    if (!safeId || safeId.includes('..')) return;
    // Recover a stale lock: if a process died mid-apply the file stays at
    // .applying forever; anything older than 5 minutes goes back to pending.
    try {
        const lockPath = repairFilePath(safeId, 'applying');
        const st = fs.statSync(lockPath);
        if (Date.now() - st.mtimeMs > 5 * 60 * 1000) {
            fs.renameSync(lockPath, repairFilePath(safeId, 'rsc'));
            repairLog(safeId, `recovered stale lock after ${Math.round((Date.now() - st.mtimeMs) / 1000)}s`);
            logger.warn('Recovered stale router-repair lock', { router: safeId });
        }
    } catch (e) { /* no lock file, nothing to recover */ }
    let pendingExists = false;
    try { fs.statSync(repairFilePath(safeId, 'rsc')); pendingExists = true; } catch (e) { /* none pending */ }
    if (!pendingExists) return;
    try { fs.renameSync(repairFilePath(safeId, 'rsc'), repairFilePath(safeId, 'applying')); } catch (e) { return; }
    // fs.rename preserves mtime — and the tracked .rsc may be hours old — so
    // TOUCH the lock now, otherwise every heartbeat mistakes the fresh lock
    // for a stale one (> 5 min) and starts a duplicate apply.
    try { fs.utimesSync(repairFilePath(safeId, 'applying'), new Date(), new Date()); } catch (e) { /* mtime stays, harmless */ }
    repairInFlight.add(routerID);
    logger.info('Applying pending router repair', { router: safeId });
    repairLog(safeId, `apply start (attempt ${(() => { try { return String(parseInt(String(fs.readFileSync(repairFilePath(safeId, 'attempts'), 'utf8')).trim() || '0', 10) || 0) + 1; } catch (e) { return '1'; } })()})`);
    setImmediate(async () => {
        try {
            // The router downloads the script itself and imports it — avoids
            // the RouterOS API word-size limit on large =source= payloads.
            const token = issueRepairToken(safeId);
            const scriptUrl = `${REPAIR_SCRIPT_BASE_URL}/api/zero-touch/repair-script/${token}`;
            const outcome = await withRepairTimeout(
                mikrotikService.fetchAndImportScript(routerID, scriptUrl, 'hotbando-repair.rsc', (m) => repairLog(safeId, m))
            );
            repairLog(safeId, `outcome=${outcome === true ? 'applied' : outcome === 'timeout' ? 'timeout' : 'failed'}`);
            if (outcome === true) {
                try { fs.unlinkSync(repairFilePath(safeId, 'attempts')); } catch (e) {}
                try { fs.unlinkSync(repairFilePath(safeId, 'error')); } catch (e) {}
                try { fs.renameSync(repairFilePath(safeId, 'applying'), repairFilePath(safeId, 'applied')); } catch (e) {}
                logger.info('Router repair applied successfully', { router: safeId });
            } else {
                restorePendingRepair(safeId, outcome === 'timeout' ? 'repair timed out' : 'apply returned false');
            }
        } catch (err) {
            repairLog(safeId, `exception: ${err.message}`);
            restorePendingRepair(safeId, err.message);
        } finally {
            repairInFlight.delete(routerID);
        }
    });
}

// Repair state only — no script contents, no credentials. Lets the operator
// (and monitoring) confirm that a pushed repair reached the router.
function routerRepairState(routerID) {
    const safeId = String(routerID || '').replace(/[^A-Za-z0-9._-]/g, '');
    if (!safeId || safeId.includes('..')) return { state: 'unknown' };
    let attempts = 0;
    try { attempts = parseInt(String(fs.readFileSync(repairFilePath(safeId, 'attempts'), 'utf8')).trim() || '0', 10) || 0; } catch (e) {}
    let lastError = null;
    try { lastError = String(fs.readFileSync(repairFilePath(safeId, 'error'), 'utf8')).trim() || null; } catch (e) {}
    let lastLog = null;
    try { lastLog = String(fs.readFileSync(repairFilePath(safeId, 'log'), 'utf8')).trim() || null; } catch (e) {}
    let applyingAgeSec;
    try {
        const st = fs.statSync(repairFilePath(safeId, 'applying'));
        applyingAgeSec = Math.round((Date.now() - st.mtimeMs) / 1000);
    } catch (e) { /* not applying */ }
    for (const state of ['applied', 'failed', 'applying', 'rsc']) {
        try {
            fs.statSync(repairFilePath(safeId, state));
            return {
                router: safeId, state,
                attempts: attempts || undefined,
                ...(applyingAgeSec !== undefined ? { applyingAgeSec } : {}),
                ...(lastError ? { lastError } : {}),
                ...(lastLog ? { lastLog } : {})
            };
        } catch (e) { /* try next */ }
    }
    return { router: safeId, state: 'none', ...(lastLog ? { lastLog } : {}) };
}


function authRegister(req, res, next) {
    const secret = (req.body && req.body.secret) || req.query.secret;
    const expected = ROUTER_REGISTRATION_SECRET;
    if (!expected) {
        return res.status(500).json({ success: false, message: 'Server registration secret not configured' });
    }
    if (!secret || secret !== expected) {
        return res.status(401).json({ success: false, message: 'Invalid registration secret' });
    }
    next();
}

function extractRouterPayload(req) {
    const q = req.query || {};
    const b = req.body || {};
    return {
        serial: b.serial || b.serial_number || q.serial || q.serial_number,
        identity: b.identity || q.identity,
        model: b.model || q.model,
        firmware: b.firmware || q.firmware,
        publicIp: b.public_ip || b.publicIp || q.public_ip || q.publicIp,
        routerId: b.router_id || b.device_id || q.router_id || q.device_id,
        locationId: b.location_id || q.location_id || null,
        ssid: b.ssid || q.ssid || null
    };
}

// ── POST /register — phase 1: register as PENDING, get wait-and-poll script ──
// ── GET  /register — same via query params (robust for RouterOS /tool fetch,
//                     which struggles with JSON http-data quoting). The secret
//                     is still required (?secret=...).
async function handleRegister(req, res) {
    try {
        const payload = extractRouterPayload(req);
        const autoConnect = req.query.auto_connect === '1' || req.query.auto_connect === 'true' || req.body?.auto_connect === true || req.body?.auto_connect === '1';

        let result = await registerRouter(payload);

        if (autoConnect) {
            // Automatically connect and generate the full provision script immediately
            const connectResult = await connectRouter(result.router.router_id, payload);
            res.set('Content-Type', 'text/plain; charset=utf-8');
            res.set('X-HotBando-Router-ID', result.router.router_id);
            res.set('X-HotBando-WG-IP', result.assignedIp);
            res.set('X-HotBando-Status', 'configuring');
            return res.send(connectResult.script);
        }

        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.set('X-HotBando-Router-ID', result.router.router_id);
        res.set('X-HotBando-WG-IP', result.assignedIp);
        res.set('X-HotBando-Status', result.pending ? 'pending' : 'ready');
        res.send(result.script);
    } catch (error) {
        logger.error('zero-touch register error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}
router.post('/register', authRegister, handleRegister);
router.get('/register', authRegister, handleRegister);

// ── GET /bootstrap — public bootstrap script (no auth, router not yet registered) ──
// Router fetches this once on first boot: /tool fetch url=.../bootstrap dst-path=bootstrap.rsc
router.get('/bootstrap', async (req, res) => {
    try {
        const script = genBootScript();
        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.set('X-HotBando-Script', 'bootstrap');
        res.send(script);
    } catch (error) {
        logger.error('bootstrap error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ── POST /register-json — same but returns structured payload (for debugging) ──
router.post('/register-json', authRegister, async (req, res) => {
    try {
        const result = await registerRouter(extractRouterPayload(req));

        res.json({
            success: true,
            status: result.pending ? 'pending' : 'ready',
            router: {
                id: result.router.router_id,
                name: result.router.router_name,
                assignedIp: result.assignedIp,
                wireguardIp: result.assignedIp
            },
            server: {
                publicIp: result.serverPublicIp,
                port: result.wgPort,
                network: result.wgNetwork
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ── GET/POST /provision/:routerID — serve wait script while pending, full when approved ──
async function serveScript(req, res) {
    try {
        const routerID = req.params.routerID;
        const result = await provisionRouter({
            routerId: routerID
        });

        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.set('X-HotBando-Router-ID', routerID);
        if (result.assignedIp) res.set('X-HotBando-WG-IP', result.assignedIp);
        res.set('X-HotBando-Status', result.pending ? 'pending' : 'ready');
        res.send(result.script);
    } catch (error) {
        logger.error('provision error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}
router.get('/provision/:routerID', authRegister, serveScript);
router.post('/provision/:routerID', authRegister, serveScript);

// ── GET /repair-script/:token — one-time repair script download ──
// Served only to a router holding a freshly issued token; the token dies on
// first use and after 15 minutes. File-backed so any cluster process serves it.
router.get('/repair-script/:token', (req, res) => {
    const token = String(req.params.token || '');
    const safeId = findRepairToken(token);
    if (!safeId) return res.status(404).send('not found');
    let source = null;
    for (const suffix of ['applying', 'rsc']) {
        try { source = fs.readFileSync(repairFilePath(safeId, suffix), 'utf8'); break; } catch (e) { /* try next */ }
    }
    if (!source) return res.status(404).send('not found');
    consumeRepairToken(token, safeId);
    repairLog(safeId, 'script downloaded by router');
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Cache-Control', 'no-store');
    res.send(source);
});

// ── GET /repair-status/:routerID — delivery state of a pushed repair ──
// (state only; no script contents, no credentials)
router.get('/repair-status/:routerID', (req, res) => {
    res.json({ success: true, ...routerRepairState(req.params.routerID) });
});

// ── POST/GET /heartbeat — check-in ──
router.post('/heartbeat', authRegister, async (req, res) => {
    try {
        const routerID = req.body.router_id || req.body.routerId || req.query.router_id || req.query.routerId;
        if (!routerID) return res.status(400).json({ success: false, message: 'router_id required' });

        // Auto-mark ONLINE when router is configured (has WG peer + IP).
        // Routers remain PENDING until owner clicks CONNECT in the admin panel;
        // after that, heartbeat keeps them online.
        await db.execute(
            `UPDATE mikrotiks SET last_seen = NOW(),
                status = IF(setup_status = 'configured', 'online', status)
             WHERE router_id = ?`,
            [routerID]
        );

        const [r] = await db.execute(
            'SELECT setup_status, ssid, wireguard_ip FROM mikrotiks WHERE router_id = ?', [routerID]
        );
        const router = r[0] || null;

        // Apply any pending remote repair (background, never blocks the reply)
        maybeApplyRouterRepair(routerID);

        res.json({
            success: true,
            ok: true,
            needsConfig: !!(router && router.setup_status !== 'configured'),
            configVersion: router ? router.updated_at : null,
            ssid: router ? router.ssid : null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get('/heartbeat', authRegister, async (req, res) => {
    try {
        const routerID = req.query.router_id || req.query.routerId;
        if (!routerID) return res.status(400).json({ success: false, message: 'router_id required' });

        await db.execute(
            `UPDATE mikrotiks SET last_seen = NOW(),
                status = IF(setup_status = 'configured', 'online', status)
             WHERE router_id = ?`,
            [routerID]
        );

        const [r] = await db.execute(
            'SELECT setup_status, ssid, wireguard_ip FROM mikrotiks WHERE router_id = ?', [routerID]
        );
        const router = r[0] || null;

        // Apply any pending remote repair (background, never blocks the reply)
        maybeApplyRouterRepair(routerID);

        res.json({
            success: true,
            ok: true,
            needsConfig: !!(router && router.setup_status !== 'configured'),
            configVersion: router ? router.updated_at : null,
            ssid: router ? router.ssid : null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;