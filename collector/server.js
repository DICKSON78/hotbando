/**
 * HotBando Router Collector
 * -------------------------
 * Deployed on the customer LAN (near the MikroTik router). It connects
 * outbound to the HotBando cloud via a reverse WebSocket tunnel so the
 * cloud server can auto-detect and remotely manage MikroTik routers even
 * when the router is behind NAT / private IP (e.g. 10.7.0.5) and no inbound
 * ports are open.
 *
 * Outbound connection only: customer never needs to open inbound ports.
 */

const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const RouterOSAPI = require('node-routeros').RouterOSAPI;

const COLLECTOR_KEY = process.env.COLLECTOR_KEY || '';
const COLLECTOR_NAME = process.env.COLLECTOR_NAME || 'site-collector';
const CLOUD_WS_URL = process.env.CLOUD_WS_URL || 'wss://hotbandowifi.online/api/collector/ws';
const HEARTBEAT_MS = 15000;
const RECONNECT_MS = 5000;

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true, collector: COLLECTOR_NAME, connected: !!wsConn });
});

// In-memory registry of MikroTik connections discovered on this LAN.
const routers = new Map();

let wsConn = null;
let wsPingTimer = null;

function connectRouter(entry) {
  if (entry.conn) {
    try {
      entry.conn.write('/system/identity/print');
      return entry.conn;
    } catch (_) {
      try { entry.conn.close(); } catch (_) {}
      entry.conn = null;
    }
  }

  const conn = new RouterOSAPI({
    host: entry.host,
    user: entry.user,
    password: entry.password,
    port: entry.port || 8728,
    timeout: 8
  });

  conn.connect().then(async () => {
    entry.conn = conn;
    entry.error = null;
    entry.lastSeen = new Date().toISOString();
    // Fetch identity + model for auto-registration.
    try {
      const [id] = await conn.write('/system/identity/print');
      const [res] = await conn.write('/system/resource/print');
      entry.identity = (id && id.name) || entry.identity || null;
      entry.model = (res && res['board-name']) || entry.model || null;
      entry.firmware = (res && res['version']) || entry.firmware || null;
    } catch (_) {}
    console.log(`[collector] connected to ${entry.host}:${entry.port} (${entry.identity || 'unknown'})`);
  }).catch((err) => {
    entry.conn = null;
    entry.error = err.message;
    console.error(`[collector] connect ${entry.host} failed:`, err.message);
  });

  return conn;
}

function discoverLocalRouters() {
  const candidates = [
    { host: '192.168.1.1', port: 8728 },
    { host: '192.168.0.1', port: 8728 },
    { host: '10.0.0.1', port: 8728 },
    { host: '10.7.0.5', port: 8728 }
  ];

  for (const c of candidates) {
    const key = `${c.host}:${c.port}`;
    if (routers.has(key)) continue;
    const entry = { host: c.host, port: c.port, user: 'admin', password: '', conn: null,
                    lastSeen: null, error: null, identity: null, model: null, firmware: null };
    routers.set(key, entry);
    connectRouter(entry);
  }
}

function sendToCloud(obj) {
  if (wsConn && wsConn.readyState === WebSocket.OPEN) {
    wsConn.send(JSON.stringify(obj));
  }
}

function reportHeartbeat() {
  const list = [];
  for (const [key, e] of routers) {
    list.push({
      key,
      host: e.host,
      port: e.port,
      connected: !!e.conn,
      error: e.error || null,
      lastSeen: e.lastSeen,
      identity: e.identity,
      model: e.model,
      firmware: e.firmware
    });
  }
  sendToCloud({ type: 'heartbeat', collector: COLLECTOR_NAME, key: COLLECTOR_KEY, routers: list, at: new Date().toISOString() });
}

function handleCloudMessage(msg) {
  if (!msg || msg.type !== 'mikrotik') return;

  const { id, path, args = {} } = msg;
  const routerKey = msg.router || msg.routerId || msg.router_id;
  let entry = routerKey ? routers.get(routerKey) : null;

  if (!entry) {
    for (const [k, e] of routers) {
      if (e.conn) { entry = e; break; }
    }
  }

  const reply = (ok, data, error) => {
    if (!wsConn || wsConn.readyState !== WebSocket.OPEN) return;
    wsConn.send(JSON.stringify({ type: 'mikrotik_response', id, ok, data: data || null, error: error || null, router: routerKey }));
  };

  if (!entry || !entry.conn) {
    if (entry) connectRouter(entry);
    setTimeout(() => {
      entry = routerKey ? routers.get(routerKey) : null;
      if (!entry || !entry.conn) return reply(false, null, entry ? entry.error : 'no router connected');
      run();
    }, 1500);
    return;
  }

  async function run() {
    try {
      const res = await entry.conn.write(path, args);
      reply(true, res);
    } catch (err) {
      entry.error = err.message;
      entry.conn = null;
      reply(false, null, err.message);
    }
  }
  run();
}

function connectCloud() {
  wsConn = new WebSocket(CLOUD_WS_URL);

  wsConn.on('open', () => {
    console.log('[collector] cloud tunnel open');
    if (wsPingTimer) clearInterval(wsPingTimer);
    wsPingTimer = setInterval(reportHeartbeat, HEARTBEAT_MS);
    sendToCloud({ type: 'announce', collector: COLLECTOR_NAME, key: COLLECTOR_KEY });
    discoverLocalRouters();
    reportHeartbeat();
  });

  wsConn.on('message', (raw) => {
    try { handleCloudMessage(JSON.parse(raw)); } catch (_) {}
  });

  wsConn.on('close', () => {
    console.log('[collector] cloud tunnel closed, reconnecting...');
    wsConn = null;
    if (wsPingTimer) clearInterval(wsPingTimer);
    setTimeout(connectCloud, RECONNECT_MS);
  });

  wsConn.on('error', (err) => {
    console.error('[collector] ws error:', err.message);
  });
}

connectCloud();
setInterval(discoverLocalRouters, 60 * 60 * 1000);

const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '3001', 10);
server.listen(PORT, () => {
  console.log(`[collector] ${COLLECTOR_NAME} listening local on :${PORT}`);
});
