/**
 * MikroTik Setup Routes — Self-contained, real-time SSE terminal
 *
 * GET  /api/mikrotik-setup/detect         — verify a MikroTik at given IP
 * GET  /api/mikrotik-setup/scan           — scan local ARP table for MikroTik OUI
 * POST /api/mikrotik-setup/configure      — SSE stream: detect → register → WireGuard
 * GET  /api/mikrotik-setup/server-status  — WireGuard server status
 * POST /api/mikrotik-setup/apply-server   — re-apply WireGuard server config
 */

const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/authMiddleware');
const mikrotikDetector = require('../utils/mikrotikDetector');
const mikrotikService = require('../utils/mikrotik');
const routerManager = require('../utils/routerManager');
const wireguardService = require('../utils/wireguard');
const db = require('../config/database');
const logger = require('../utils/logger');
const RouterOSAPI = require('node-routeros').RouterOSAPI;
const net = require('net');

// Fast TCP pre-check (1.5s): avoids the ~4s API timeout per unreachable WG IP
function isPrivateLanIp(ip) {
    if (!ip) return false;
    if (String(ip).startsWith('10.7.')) return false;
    if (String(ip).startsWith('10.')) return true;
    if (String(ip).startsWith('192.168.')) return true;
    if (String(ip).startsWith('127.')) return true;
    if (String(ip).startsWith('172.')) {
        const second = parseInt(String(ip).split('.')[1], 10);
        return second >= 16 && second <= 31;
    }
    return false;
}

function tcpOpen(ip, port, ms = 1500) {
    return new Promise((resolve) => {
        const s = new net.Socket();
        const done = (v) => { try { s.destroy(); } catch (e) {} resolve(v); };
        s.setTimeout(ms);
        s.once('connect', () => done(true));
        s.once('timeout', () => done(false));
        s.once('error', () => done(false));
        try { s.connect(port, ip); } catch (e) { done(false); }
    });
}

router.use(adminAuth);

// ── SSE helper ──
function createSSE(res) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    });

    let closed = false;
    const send = (event, data) => {
        if (closed) return;
        try {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch (e) { closed = true; }
    };
    const close = () => { closed = true; try { res.end(); } catch (e) {} };
    res.on('close', () => { closed = true; });

    return { send, close, isClosed: () => closed };
}

// ── GET /detect — Verify a MikroTik at IP ──
router.get('/detect', async (req, res) => {
    try {
        const { ip, port = 8728, user = 'admin', password = '' } = req.query;
        if (!ip) return res.status(400).json({ success: false, message: 'IP is required' });

        const result = await mikrotikDetector.verifyMikrotik(ip, parseInt(port), user, password);

        // Auto-discover factory/default credentials when the supplied ones fail
        // AUTH on a real RouterOS box (so a fresh router can be onboarded
        // without typing a password). Non-routers stay fast (single attempt).
        if (result.authFailed) {
            const found = await mikrotikDetector.findWorkingCredentials(ip, parseInt(port));
            if (found) {
                Object.assign(result, found);
                result.credentialsAuto = { user: found.user, password: found.password };
            }
        }

        if (result.isMikrotik && !result.authFailed) {
            // Check if already in DB
            const [existing] = await db.execute(
                'SELECT id, router_id, router_name, setup_status FROM mikrotiks WHERE host = ?', [ip]
            );
            result.inDatabase = existing.length > 0;
            result.existingRouter = existing[0] || null;
        }

        // Actionable truth instead of a dead-end "not a MikroTik"
        if (!result.isMikrotik) {
            const inTunnel = ip.startsWith('10.7.');
            if (inTunnel) {
                try {
                    const [rows] = await db.execute(
                        'SELECT router_id, router_name, setup_status FROM mikrotiks WHERE wireguard_ip = ? LIMIT 1', [ip]
                    );
                    if (rows.length > 0) {
                        const r = rows[0];
                        result.message = `Router "${r.router_name || r.router_id}" is registered (${r.setup_status}) but its tunnel is DOWN — it has never connected (no WireGuard handshake). Power it on, check its internet, or re-run its bootstrap script. Nothing is wrong with Detect.`;
                        result.tunnelDown = true;
                        result.existingRouter = { router_id: r.router_id, router_name: r.router_name };
                    } else {
                        result.message = `No registered router owns tunnel IP ${ip}. A router appears here only after it phones home (bootstrap import) and you press Connect.`;
                    }
                } catch (e) {
                    result.message = `Tunnel IP ${ip} is unreachable — the router has not connected yet.`;
                    result.tunnelDown = true;
                }
            } else if (result.authFailed) {
                result.message = `A MikroTik responded at ${ip} but the credentials were rejected and no default credentials worked. Enter the correct admin password (Manual connect).`;
            } else if (isPrivateLanIp(ip)) {
                result.message = `This HotBando server cannot reach ${ip}:${parseInt(port)} — that address lives on the technician laptop/router LAN, not on the cloud. Auto-Detect and Detect-by-IP will never see a factory router at 192.168.88.1. Open Site Setup, copy the site script, paste it in WebFig Terminal at http://192.168.88.1 (WAN must have internet), then wait for PENDING and press Connect.`;
                result.useSiteSetup = true;
            } else {
                result.message = `Nothing responding at ${ip}:${parseInt(port)}. Check power, cable/WiFi, and that the router API (port ${parseInt(port)}) is reachable from this server. For a plugged-in factory router, use Site Setup (zero-touch script) instead of Detect-by-IP.`;
                result.useSiteSetup = true;
            }
        }

        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ── GET /scan — Scan ARP table for MikroTik OUIs + WireGuard tunnel network ──
// On a cloud server the container ARP only sees docker — so this also probes
// every router's assigned WireGuard IP (10.7.0.0/16). A remote router that
// phoned home appears here exactly as if it were on the local LAN
// (source: 'tunnel'). Dar team never needs Detect-by-IP.
router.get('/scan', async (req, res) => {
    try {
        const devices = await mikrotikDetector.scanForMikroTik(req.query.network || null);
        // Merge tunnel devices (remote routers reachable over WireGuard)
        try {
            const [rows] = await db.execute(
                `SELECT router_id, router_name, wireguard_ip, model, firmware_version, serial_number
                 FROM mikrotiks WHERE wireguard_ip IS NOT NULL AND wireguard_ip != ''`
            );
            for (const r of rows) {
                if (devices.some(d => d.ip === r.wireguard_ip)) continue;
                // Fast pre-check first: skip the ~4s API timeout when the port is closed
                let live = null;
                try {
                    if (await tcpOpen(r.wireguard_ip, 8728)) {
                        live = await mikrotikDetector.verifyMikrotik(r.wireguard_ip, 8728, 'admin', '');
                    }
                } catch (e) { live = null; }
                devices.push({
                    ip: r.wireguard_ip, mac: null, source: 'tunnel',
                    isMikrotik: !!(live && live.isMikrotik),
                    identity: (live && live.identity) || r.router_name || r.router_id,
                    model: (live && live.model) || r.model || null,
                    firmware: (live && live.firmware) || r.firmware_version || null,
                    inDatabase: true,
                    existingRouter: { router_id: r.router_id, router_name: r.router_name }
                });
            }
        } catch (e) { logger.warn('tunnel scan skipped: ' + e.message); }
        res.json({
            success: true,
            count: devices.length,
            devices: devices.map(d => ({
                ip: d.ip, mac: d.mac || null, source: d.source,
                isMikrotik: d.isMikrotik, identity: d.identity,
                model: d.model, firmware: d.firmware,
                inDatabase: d.inDatabase, existingRouter: d.existingRouter
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ── POST /configure — SSE: full detect → register → WireGuard configure ──
router.post('/configure', async (req, res) => {
    const sse = createSSE(res);
    const log = (msg, type = 'info') => sse.send('log', { message: msg, type, time: new Date().toISOString() });

    const {
        ip, port = 8728, user = 'admin', password = '',
        routerName, locationId, ssid = 'HotBando-Free-WiFi',
        latitude, longitude
    } = req.body;

    if (!ip) {
        sse.send('error', { message: 'IP address is required' });
        return sse.close();
    }

    (async () => {
        try {
            // ── Step 1: Connect & detect ──
            log('Connecting to MikroTik at ' + ip + ':' + port + '...');
            sse.send('progress', { step: 1, total: 8, label: 'Detecting MikroTik' });

            const RouterOSAPI = require('node-routeros').RouterOSAPI;
            let conn;
            try {
                conn = new RouterOSAPI({ host: ip, user, password, port: parseInt(port), timeout: 8000 });
                await Promise.race([
                    conn.connect(),
                    new Promise((_, rej) => setTimeout(() => rej(new Error('Connection timeout (8s)')), 9000))
                ]);
            } catch (connectErr) {
                log('Connection failed: ' + connectErr.message, 'error');
                sse.send('error', { message: 'Cannot connect to router: ' + connectErr.message, step: 'detect' });
                return sse.close();
            }

            const [identity] = await conn.write('/system/identity/print');
            const [resource] = await conn.write('/system/resource/print');
            const [board] = await conn.write('/system/routerboard/print');

            const routerIdentity = identity.name || 'Unknown';
            const routerModel = board['board-name'] || resource['board-name'] || 'Unknown';
            const routerFirmware = resource.version || 'Unknown';
            const routerSerial = board.serial_number || '';

            log('Detected: ' + routerIdentity + ' (' + routerModel + ', v' + routerFirmware + ')', 'success');
            sse.send('detected', {
                identity: routerIdentity, model: routerModel,
                firmware: routerFirmware, serial: routerSerial
            });

            // ── Step 2: Check existing interfaces / WireGuard package ──
            log('Checking WireGuard package availability...');
            sse.send('progress', { step: 2, total: 8, label: 'Checking WireGuard support' });

            let wgPackageInstalled = false;
            try {
                const [packages] = await conn.write('/system/package/print');
                wgPackageInstalled = packages.some(p =>
                    (p.name || '').toLowerCase().includes('wireguard') && p.disabled !== 'true'
                );
            } catch (e) { /* may not support packages */ }

            if (!wgPackageInstalled) {
                log('WireGuard package not detected on router — will attempt to use built-in support', 'warn');
            } else {
                log('WireGuard package found', 'success');
            }

            // Check for existing wg-hotbando interface
            let wgExists = false;
            try {
                const [wgIfaces] = await conn.write('/interface/wireguard/print');
                wgExists = wgIfaces.some(w => w.name === 'wg-hotbando');
            } catch (e) { /* wireguard not available as sub-command */ }

            if (wgExists) {
                log('WireGuard interface wg-hotbando already exists — will reconfigure', 'warn');
                // Remove old interface to reconfigure
                try {
                    const [oldIface] = await conn.write('/interface/wireguard/print', ['?name=wg-hotbando']);
                    if (oldIface && oldIface['.id']) {
                        await conn.write('/interface/wireguard/remove', [`=.id=${oldIface['.id']}`]);
                        log('Removed existing wg-hotbando interface');
                    }
                } catch (e) { /* ignore */ }
            }

            // ── Step 3: Get current interfaces (for hotspot setup later) ──
            log('Enumerating network interfaces...');
            sse.send('progress', { step: 3, total: 8, label: 'Scanning interfaces' });

            let interfaces = [];
            try {
                interfaces = await conn.write('/interface/print');
                log('Found ' + interfaces.length + ' interfaces');
                sse.send('interfaces', { interfaces: interfaces.map(i => ({ name: i.name, type: i.type, running: i.running })) });
            } catch (e) {
                log('Could not enumerate interfaces: ' + e.message, 'warn');
            }

            // ── Step 4: Generate WireGuard keys ──
            log('Generating WireGuard keypairs...');
            sse.send('progress', { step: 4, total: 8, label: 'Generating WireGuard keys' });

            const serverKeys = wireguardService.ensureServerKeys();
            const routerKeys = wireguardService.generateKeyPair();
            const presharedKey = wireguardService.generatePresharedKey();
            const assignedIp = await wireguardService.getNextAvailableIp();

            log('Server public key: ' + serverKeys.publicKey.substring(0, 20) + '...');
            log('Router assigned IP: ' + assignedIp);
            sse.send('keys-generated', { assignedIp });

            // ── Step 5: Push WireGuard config to MikroTik ──
            log('Configuring WireGuard on MikroTik...');
            sse.send('progress', { step: 5, total: 8, label: 'Configuring WireGuard on router' });

            const wgCommands = [];

            // 5a. Create WireGuard interface
            try {
                await conn.write('/interface/wireguard/add', [
                    `=name=wg-hotbando`,
                    `=listen-port=13231`,
                    `=private-key="${routerKeys.privateKey}"`
                ]);
                wgCommands.push('Created interface wg-hotbando');
                log('Created WireGuard interface wg-hotbando', 'success');
            } catch (e) {
                log('Interface create: ' + e.message, 'warn');
                wgCommands.push('Interface create failed (may exist): ' + e.message);
            }

            // 5b. Add server as peer
            try {
                await conn.write('/interface/wireguard/peers/add', [
                    `=interface=wg-hotbando`,
                    `=public-key="${serverKeys.publicKey}"`,
                    `=endpoint-address=${wireguardService.serverPublicIp}`,
                    `=endpoint-port=${wireguardService.listenPort}`,
                    `=allowed-address=${wireguardService.networkCidr}`,
                    `=persistent-keepalive=25s`
                ]);
                wgCommands.push('Added server peer');
                log('Added server as WireGuard peer', 'success');
            } catch (e) {
                log('Peer add: ' + e.message, 'warn');
                wgCommands.push('Peer add failed: ' + e.message);
            }

            // 5c. Assign IP
            try {
                await conn.write('/ip/address/add', [
                    `=address=${assignedIp}/24`,
                    `=interface=wg-hotbando`
                ]);
                wgCommands.push('Assigned IP ' + assignedIp);
                log('Assigned IP ' + assignedIp + ' to wg-hotbando', 'success');
            } catch (e) {
                log('IP assign: ' + e.message, 'warn');
                wgCommands.push('IP assign failed: ' + e.message);
            }

            // 5d. Route
            try {
                await conn.write('/ip/route/add', [
                    `=dst-address=${wireguardService.networkCidr}`,
                    `=gateway=wg-hotbando`
                ]);
                wgCommands.push('Added route to server network');
                log('Added route to ' + wireguardService.networkCidr, 'success');
            } catch (e) {
                log('Route: ' + e.message, 'warn');
                wgCommands.push('Route add failed: ' + e.message);
            }

            // 5e. Firewall rules
            try {
                await conn.write('/ip/firewall/filter/add', [
                    `=chain=input`, `=protocol=udp`, `=dst-port=13231`, `=action=accept`, `=comment=WireGuard`
                ]);
                await conn.write('/ip/firewall/filter/add', [
                    `=chain=forward`, `=in-interface=wg-hotbando`, `=action=accept`, `=comment="WG Fwd In"`
                ]);
                await conn.write('/ip/firewall/filter/add', [
                    `=chain=forward`, `=out-interface=wg-hotbando`, `=action=accept`, `=comment="WG Fwd Out"`
                ]);
                wgCommands.push('Added firewall rules');
                log('Firewall rules added', 'success');
            } catch (e) {
                log('Firewall: ' + e.message, 'warn');
                wgCommands.push('Firewall failed: ' + e.message);
            }

            // 5f. Restrict API to WireGuard network
            try {
                await conn.write('/ip/service/set', [
                    `=name=api`, `=address=${wireguardService.networkCidr}`
                ]);
                wgCommands.push('Restricted API access to WG network');
            } catch (e) {
                log('API restriction: ' + e.message, 'warn');
            }

            // ── Step 6: Register in database ──
            log('Registering router in database...');
            sse.send('progress', { step: 6, total: 8, label: 'Registering in database' });

            const routerID = `router-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            const finalName = routerName || routerIdentity || `Router-${ip.replace(/\./g, '-')}`;

            const addResult = await routerManager.addRouter({
                routerID, routerName: finalName,
                host: ip, port: parseInt(port), user, password, ssid
            });

            if (!addResult.success) {
                log('DB registration failed: ' + addResult.message, 'error');
                sse.send('error', { message: 'Registration failed: ' + addResult.message, step: 'register' });
                return sse.close();
            }

            log('Registered as ' + routerID, 'success');

            // Save WG info
            await wireguardService.saveRouterWireGuard(routerID, assignedIp, routerKeys.publicKey, routerKeys.privateKey, presharedKey);

            // Resolve coordinates from locationId if lat/lng not provided
            let finalLat = latitude, finalLng = longitude, finalLocName = finalName;
            if ((!finalLat || !finalLng) && locationId) {
                try {
                    const [locs] = await db.execute('SELECT name, latitude, longitude FROM locations WHERE id=?', [locationId]);
                    if (locs.length && locs[0].latitude && locs[0].longitude) {
                        finalLat = locs[0].latitude;
                        finalLng = locs[0].longitude;
                        finalLocName = locs[0].name || finalName;
                        log('Resolved location: ' + finalLocName + ' (' + finalLat + ', ' + finalLng + ')');
                    }
                } catch (e) { /* location table may not exist yet */ }
            }

            // Save location if provided
            if (finalLat && finalLng) {
                await db.execute(`
                    UPDATE mikrotiks SET latitude=?, longitude=?, location_name=?, location_id=?,
                        setup_status='configured', setup_step=6, setup_completed_at=NOW(),
                        model=?, firmware_version=?, serial_number=?
                    WHERE router_id=?
                `, [finalLat, finalLng, finalLocName, locationId || null, routerModel, routerFirmware, routerSerial, routerID]);
            } else {
                await db.execute(`
                    UPDATE mikrotiks SET setup_status='configured', setup_step=6,
                        setup_completed_at=NOW(), model=?, firmware_version=?, serial_number=?
                    WHERE router_id=?
                `, [routerModel, routerFirmware, routerSerial, routerID]);
            }

            // ── Step 7: Configure server-side WireGuard (add peer) ──
            log('Adding router to server WireGuard...');
            sse.send('progress', { step: 7, total: 8, label: 'Configuring server WireGuard' });

            const serverAdd = await wireguardService.addPeerToServer(routerID, routerKeys.publicKey, assignedIp);
            if (serverAdd.success) {
                log('Router peer added to server', 'success');
            } else {
                log('Server peer add warning: ' + (serverAdd.message || 'unknown'), 'warn');
            }

            // Apply server config
            try {
                const applyResult = await wireguardService.applyServerConfig();
                if (applyResult.success) {
                    log('Server WireGuard config applied', 'success');
                } else {
                    log('Server WireGuard apply: ' + applyResult.message, 'warn');
                }
            } catch (e) {
                log('Server WireGuard apply failed: ' + e.message, 'warn');
            }

            // ── Step 8: Verify tunnel ──
            log('Verifying WireGuard tunnel...');
            sse.send('progress', { step: 8, total: 8, label: 'Verifying connection' });

            // Try to ping the router's WG IP from the server
            let tunnelOk = false;
            try {
                const { stdout } = await require('util').promisify(require('child_process').exec)(
                    `ping -c 2 -W 2 ${assignedIp} 2>&1`
                );
                tunnelOk = stdout.includes('bytes from');
                if (tunnelOk) {
                    log('Tunnel verified — ' + assignedIp + ' is reachable', 'success');
                } else {
                    log('Tunnel ping failed (may take a moment to establish)', 'warn');
                }
            } catch (e) {
                log('Tunnel check skipped: ' + e.message, 'warn');
            }

            // Close router API connection
            try { conn.close(); } catch (e) { /* ignore */ }

            // ── Done ──
            log('Setup complete!', 'success');
            sse.send('done', {
                success: true,
                router: {
                    routerID, routerName: finalName,
                    ip, model: routerModel, firmware: routerFirmware,
                    wireguard: { assignedIp, publicKey: routerKeys.publicKey }
                },
                tunnelVerified: tunnelOk,
                commands: wgCommands
            });

        } catch (error) {
            logger.error('Configure error:', error.message);
            log('Setup failed: ' + error.message, 'error');
            sse.send('error', { message: error.message });
        } finally {
            sse.close();
        }
    })();
});

// ── GET /bootstrap — one-touch site script with server values baked in ──
// Admin copies it (or sends via WhatsApp); site person pastes once into
// WebFig Terminal. Everything after that is automatic.
router.get('/bootstrap', async (req, res) => {
    try {
        const routerProvision = require('../utils/routerProvision');
        res.json({
            success: true,
            script: routerProvision.generateBootstrapScript()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ── GET /server-status ──
router.get('/server-status', async (req, res) => {    try {
        const status = await wireguardService.getServerStatus();
        const peers = await wireguardService.getWireGuardPeers();
        res.json({ success: true, server: status, peers: peers.peers || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ── POST /apply-server — Force re-apply WireGuard server config ──
router.post('/apply-server', async (req, res) => {
    try {
        const result = await wireguardService.applyServerConfig();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
