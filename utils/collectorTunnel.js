/**
 * HotBando Collector Tunnel
 * -------------------------
 * Cloud-side WebSocket tunnel for remote router collectors.
 *
 * Collectors (customer LAN containers) connect outbound to:
 *   wss://hotbandowifi.online/api/collector/ws?key=COLLECTOR_KEY
 *
 * The cloud can then proxy MikroTik API commands through the tunnel so
 * administrators can auto-detect and manage routers from anywhere, even
 * when routers sit behind NAT/private IPs with no inbound ports open.
 */

const WebSocket = require('ws');

// collectorKey -> ws connection
const collectors = new Map();
// ws -> collectorKey
const wsToKey = new Map();

// collectorKey -> latest heartbeat { at, routers[], collector }
const heartbeatData = new Map();

// Auto-register a router discovered by a collector into the HotBando DB.
async function autoRegisterRouter(r, collectorKey) {
    const db = require('../config/database');
    const routerID = r.identity ? `router-${r.identity.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}` : null;
    if (!routerID) return;
    const [exists] = await db.execute('SELECT id FROM mikrotiks WHERE router_id = ?', [routerID]);
    if (exists.length > 0) return;
    await db.execute(
        `INSERT INTO mikrotiks
          (router_id, router_name, host, port, ssid, model, status, setup_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'offline', 'detected', NOW(), NOW())`,
        [routerID, r.identity, r.host, r.port || 8728, '', r.model || null]
    );
    console.log(`[collector-tunnel] auto-registered router ${routerID} (${r.host}) from ${collectorKey}`);
}

function setupCollectorTunnel(httpServer) {
    const wss = new WebSocket.Server({
        server: httpServer,
        path: '/api/collector/ws',
        perMessageDeflate: false
    });

    wss.on('connection', (ws, req) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const key = url.searchParams.get('key') || '';
        const name = url.searchParams.get('name') || 'collector';

        if (!key) {
            ws.close(1008, 'missing collector key');
            return;
        }

        // Re-auth: same key reconnecting replaces old connection.
        if (collectors.has(key)) {
            const old = collectors.get(key);
            try { old.close(1001, 'replaced by new connection'); } catch (_) {}
        }

        collectors.set(key, ws);
        wsToKey.set(ws, key);

        console.log(`[collector-tunnel] collector connected: ${name} (${key})`);

        ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw);
                if (msg && msg.type === 'mikrotik_response') {
                    const waiter = responseWaiters.get(msg.id);
                    if (waiter) {
                        waiter.resolve(msg);
                        responseWaiters.delete(msg.id);
                    }
                }
                if (msg && msg.type === 'heartbeat') {
                    // Store discovered routers for auto-registration.
                    const key = wsToKey.get(ws);
                    if (key && Array.isArray(msg.routers)) {
                        heartbeatData.set(key, { at: msg.at, routers: msg.routers, collector: msg.collector });
                        // Auto-register any router we haven't seen before.
                        for (const r of msg.routers) {
                            if (!r.connected || !r.identity) continue;
                            autoRegisterRouter(r, key).catch(() => {});
                        }
                    }
                }
            } catch (_) {}
        });

        ws.on('close', () => {
            collectors.delete(key);
            wsToKey.delete(ws);
            console.log(`[collector-tunnel] collector disconnected: ${name} (${key})`);
        });

        ws.on('error', (err) => {
            console.error(`[collector-tunnel] error ${key}:`, err.message);
        });
    });

    return {
        // Send a message to a specific collector. Returns true if connected.
        sendToCollector(key, msg) {
            const ws = collectors.get(key);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(msg));
                return true;
            }
            return false;
        },
        getCollectors() {
            const out = [];
            for (const [key, ws] of collectors) {
                const hb = heartbeatData.get(key);
                out.push({
                    key,
                    connected: ws.readyState === WebSocket.OPEN,
                    lastHeartbeat: hb ? hb.at : null,
                    routers: hb ? hb.routers : []
                });
            }
            return out;
        },
        getHeartbeatData(key) {
            return heartbeatData.get(key) || null;
        },
        isConnected(key) {
            const ws = collectors.get(key);
            return !!(ws && ws.readyState === WebSocket.OPEN);
        }
    };
}

// ---- Request/response waiters for proxy commands --------------------------

const responseWaiters = new Map();
const WAIT_TIMEOUT_MS = 20000;

/**
 * Send a MikroTik command to a collector and wait for the response.
 * @returns {Promise<{ok, data, error}>}
 */
function proxyToCollector(collectorTunnel, key, { path, args = {} }) {
    return new Promise((resolve) => {
        const ws = collectors.get(key);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            return resolve({ ok: false, data: null, error: 'collector not connected' });
        }

        const id = 'cmd_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        const msg = { type: 'mikrotik', id, path, args };

        const timer = setTimeout(() => {
            responseWaiters.delete(id);
            resolve({ ok: false, data: null, error: 'collector timeout' });
        }, WAIT_TIMEOUT_MS);

        responseWaiters.set(id, { resolve, timer });

        ws.send(JSON.stringify(msg));
    });
}

module.exports = { setupCollectorTunnel, proxyToCollector, responseWaiters };
module.exports.responseWaiters = responseWaiters;
