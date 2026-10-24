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
const { registerRouter, provisionRouter, ROUTER_REGISTRATION_SECRET } = require('../utils/routerProvision');
const db = require('../config/database');
const logger = require('../utils/logger');

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
        const result = await registerRouter(extractRouterPayload(req));

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

// ── POST /heartbeat — hourly check-in ──
router.post('/heartbeat', authRegister, async (req, res) => {
    try {
        const routerID = req.body.router_id || req.body.routerId;
        if (!routerID) return res.status(400).json({ success: false, message: 'router_id required' });

        // Only mark ONLINE once configured — pending stays pending until CONNECT
        await db.execute(
            `UPDATE mikrotiks SET last_seen = NOW(),
                status = IF(setup_status = 'configured', 'online', status)
             WHERE router_id = ?`,
            [routerID]
        );

        // Return current settings so the router can pull a new script on demand
        const [r] = await db.execute(
            'SELECT setup_status, ssid, wireguard_ip FROM mikrotiks WHERE router_id = ?', [routerID]
        );
        const router = r[0] || null;

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