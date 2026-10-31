/**
 * Router Fleet — Cloud remote management via collector tunnels.
 *
 * Endpoints (admin only):
 *   GET    /api/router-fleet/collectors     list connected collectors
 *   GET    /api/router-fleet/routers        routers known to collectors + DB
 *   POST   /api/router-fleet/detect         trigger discovery on a collector
 *   POST   /api/router-fleet/mikrotik       proxy a MikroTik API command
 *   POST   /api/router-fleet/register       register a discovered router in DB
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { adminAuth } = require('../middleware/authMiddleware');
const { setupCollectorTunnel, responseWaiters } = require('../utils/collectorTunnel');

let collectorTunnel = null;
function setTunnel(tunnel) { collectorTunnel = tunnel; }

router.use(adminAuth);

// List connected collectors (the "virtual computers" on customer LANs).
router.get('/collectors', async (req, res) => {
    if (!collectorTunnel) {
        return res.json({ success: true, collectors: [], note: 'tunnel not initialized' });
    }
    res.json({ success: true, collectors: collectorTunnel.getCollectors() });
});

// Routers discovered by collectors, merged with registered routers in DB.
router.get('/routers', async (req, res) => {
    try {
        const [registered] = await db.execute(
            `SELECT id, router_id, router_name, host, port, status, setup_status, ssid,
                    latitude, longitude, last_seen, created_at
             FROM mikrotiks ORDER BY created_at DESC`
        );

        res.json({ success: true, routers: registered });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Trigger auto-detection on a specific collector (scans its LAN for MikroTik).
router.post('/detect', async (req, res) => {
    try {
        const { collectorKey } = req.body;
        if (!collectorKey) {
            return res.status(400).json({ success: false, message: 'collectorKey is required' });
        }
        if (!collectorTunnel || !collectorTunnel.isConnected(collectorKey)) {
            return res.status(409).json({ success: false, message: 'Collector not connected' });
        }

        // Ask collector to (re)discover local MikroTik routers. We do this by
        // having the collector attempt connections to candidate IPs; the result
        // is reported back via the next heartbeat. For immediate feedback we
        // also probe a few common MikroTik IPs through the tunnel.
        const probe = await proxyCommand(collectorKey, '/system/identity/print', {});
        if (!probe.ok) {
            // Collector may have no router yet; tell it to scan.
            collectorTunnel.sendToCollector(collectorKey, { type: 'scan' });
            return res.json({
                success: true,
                message: 'Detection triggered on collector. Results arrive via heartbeat.'
            });
        }

        res.json({
            success: true,
            message: 'Collector reachable.',
            identity: probe.data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Proxy an arbitrary MikroTik API command through a collector tunnel.
router.post('/mikrotik', async (req, res) => {
    try {
        const { collectorKey, path, args } = req.body;
        if (!collectorKey || !path) {
            return res.status(400).json({ success: false, message: 'collectorKey and path are required' });
        }
        const result = await proxyCommand(collectorKey, path, args || {});
        res.json({ success: result.ok, data: result.data, error: result.error });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Register a discovered router into the HotBando DB.
router.post('/register', async (req, res) => {
    try {
        const {
            routerID, routerName, host, port = 8728, user = 'admin', password,
            ssid, locationName, latitude, longitude
        } = req.body;
        if (!routerID || !routerName || !host) {
            return res.status(400).json({ success: false, message: 'routerID, routerName and host are required' });
        }

        const [exists] = await db.execute('SELECT id FROM mikrotiks WHERE router_id = ?', [routerID]);
        if (exists.length > 0) {
            return res.status(409).json({ success: false, message: 'Router already registered' });
        }

        await db.execute(
            `INSERT INTO mikrotiks
              (router_id, router_name, host, port, user, password, ssid,
               location_name, latitude, longitude, status, setup_status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'offline', 'detected', NOW(), NOW())`,
            [routerID, routerName, host, port, user, password || '', ssid || '',
             locationName || null, latitude || null, longitude || null]
        );

        res.json({ success: true, message: 'Router registered. It will be configured on next connect.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

async function proxyCommand(key, path, args) {
    return new Promise((resolve) => {
        if (!collectorTunnel || !collectorTunnel.isConnected(key)) {
            return resolve({ ok: false, data: null, error: 'collector not connected' });
        }
        const id = 'fleet_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        const msg = { type: 'mikrotik', id, path, args };
        const timer = setTimeout(() => {
            responseWaiters.delete(id);
            resolve({ ok: false, data: null, error: 'collector timeout' });
        }, 20000);
        responseWaiters.set(id, { resolve, timer });
        collectorTunnel.sendToCollector(key, msg);
    });
}

module.exports = router;
module.exports.setTunnel = setTunnel;
