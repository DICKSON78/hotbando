// routes/autoDetect.js
// Auto-detection API for MikroTik routers on local network
// Scans network and returns discovered devices

const express = require('express');
const logger = require('../utils/logger');
const router = express.Router();
const mikrotikDetector = require('../utils/mikrotikDetector');
const mikrotikService = require('../utils/mikrotik');
const routerManager = require('../utils/routerManager');
const db = require('../config/database');
const { adminAuth } = require('../middleware/authMiddleware');

// All routes require admin auth
router.use(adminAuth);

/**
 * GET /api/auto-detect/scan
 * Trigger a network scan for MikroTik devices
 */
router.get('/scan', async (req, res) => {
    try {
        const { network } = req.query;
        
        logger.info('🔍 Starting network scan...');
        const devices = await mikrotikDetector.scanForMikroTik(network || null);
        
        res.json({
            success: true,
            message: `Found ${devices.length} MikroTik device(s)`,
            devices: devices.map(d => ({
                ip: d.ip,
                mac: d.mac || null,
                source: d.source,
                confidence: d.confidence,
                isMikrotik: d.isMikrotik,
                identity: d.identity || null,
                model: d.model || null,
                firmware: d.firmware || null,
                inDatabase: d.inDatabase,
                existingRouter: d.existingRouter
            })),
            networkInterfaces: await mikrotikDetector.getNetworkInfo()
        });
    } catch (error) {
        logger.error('Scan error:', error.message);
        res.status(500).json({ success: false, message: 'Scan failed: ' + error.message });
    }
});

/**
 * GET /api/auto-detect/status
 * Get current detection status and cached results
 */
router.get('/status', async (req, res) => {
    try {
        const detected = mikrotikDetector.getDetected();
        const networkInterfaces = await mikrotikDetector.getNetworkInfo();
        
        res.json({
            success: true,
            detectedCount: detected.length,
            devices: detected,
            networkInterfaces,
            isScanning: mikrotikDetector.isScanning
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/auto-detect/verify
 * Verify if a specific IP is a MikroTik router
 */
router.post('/verify', async (req, res) => {
    try {
        const { ip, port = 8728, user = 'admin', password = '' } = req.body;
        
        if (!ip) {
            return res.status(400).json({ success: false, message: 'IP address is required' });
        }

        logger.info(`🔍 Verifying ${ip}...`);
        const result = await mikrotikDetector.verifyMikrotik(ip, port, user, password);
        
        res.json({
            success: true,
            ip,
            ...result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/auto-detect/quick-setup
 * Quick setup: detect, register, and configure in one step
 * Includes location capture with GPS coordinates
 */
router.post('/quick-setup', async (req, res) => {
    try {
        const {
            ip,
            port = 8728,
            user = 'admin',
            password = process.env.MIKROTIK_DEFAULT_PASSWORD || 'admin',
            routerName,
            serverIP,
            radiusSecret = process.env.RADIUS_SECRET || '',
            ssid = 'HotBando-Free-WiFi',
            // Location data
            latitude,
            longitude,
            locationName,
            locationAddress,
            locationCity,
            locationRegion,
            locationType = 'other'
        } = req.body;

        if (!ip) {
            return res.status(400).json({ success: false, message: 'Router IP is required' });
        }

        if (!serverIP) {
            return res.status(400).json({ success: false, message: 'Server IP is required' });
        }

        logger.info(`🚀 Quick setup for ${ip}...`);

        // Step 1: Verify it's a MikroTik
        const verification = await mikrotikDetector.verifyMikrotik(ip, port, user, password);
        if (!verification.isMikrotik) {
            return res.json({
                success: false,
                message: 'Device at ' + ip + ' is not a MikroTik router',
                step: 'verify'
            });
        }

        // Step 2: Generate router ID
        const routerID = `router-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const finalRouterName = routerName || verification.identity || `Router-${ip.replace(/\./g, '-')}`;

        // Step 3: Register router in database
        const addResult = await routerManager.addRouter({
            routerID,
            routerName: finalRouterName,
            host: ip,
            port,
            user,
            password,
            ssid
        });

        if (!addResult.success) {
            return res.json({
                success: false,
                message: 'Failed to register router: ' + addResult.message,
                step: 'register'
            });
        }

        // Step 4: Configure router
        const configResult = await routerManager.configureRouter(routerID, {
            serverIP,
            radiusSecret,
            hotspotInterface: 'wlan1',
            hotspotIP: process.env.HOTSPOT_IP || '10.5.50.1',
            hotspotNet: '10.5.50.0',
            ssid
        });

        if (!configResult.success) {
            return res.json({
                success: false,
                message: 'Configuration failed: ' + configResult.message,
                step: 'configure',
                routerID
            });
        }

        // Step 5: Save location
        if (latitude && longitude) {
            await db.execute(
                `UPDATE mikrotiks SET 
                    latitude = ?,
                    longitude = ?,
                    location_name = ?,
                    location_address = ?,
                    location_city = ?,
                    location_region = ?,
                    location_type = ?,
                    setup_status = 'configured',
                    setup_step = 6,
                    setup_completed_at = NOW()
                WHERE router_id = ?`,
                [
                    latitude,
                    longitude,
                    locationName || finalRouterName,
                    locationAddress || '',
                    locationCity || '',
                    locationRegion || '',
                    locationType,
                    routerID
                ]
            );

            // Log to history
            await db.execute(
                `INSERT INTO router_location_history 
                    (router_id, latitude, longitude, location_name, location_type, moved_at)
                VALUES (?, ?, ?, ?, ?, NOW())`,
                [routerID, latitude, longitude, locationName || finalRouterName, locationType]
            );
        } else {
            // No GPS, just mark as configured
            await db.execute(
                `UPDATE mikrotiks SET 
                    setup_status = 'configured',
                    setup_step = 6,
                    setup_completed_at = NOW()
                WHERE router_id = ?`,
                [routerID]
            );
        }

        // Step 6: Verify configuration
        const verifyResult = await routerManager.verifyConfiguration(routerID);

        logger.info(`✅ Quick setup complete for ${finalRouterName}`);

        res.json({
            success: true,
            message: 'Router configured successfully!',
            router: {
                routerID,
                routerName: finalRouterName,
                ip,
                ssid,
                model: verification.model,
                firmware: verification.firmware,
                location: {
                    latitude,
                    longitude,
                    name: locationName || finalRouterName,
                    city: locationCity,
                    region: locationRegion
                }
            },
            configuration: configResult,
            verification: verifyResult,
            nextSteps: [
                'Connect to WiFi: ' + ssid,
                'Open browser: http://10.5.50.1',
                'Login: admin / ' + (process.env.HOTSPOT_ADMIN_PASSWORD || 'hotbando2024'),
                'Start selling vouchers!'
            ]
        });

    } catch (error) {
        logger.error('Quick setup error:', error.message);
        res.status(500).json({ success: false, message: 'Setup failed: ' + error.message });
    }
});

/**
 * PUT /api/auto-detect/move-router
 * Move router to a new location
 */
router.put('/move-router', async (req, res) => {
    try {
        const {
            routerID,
            newLatitude,
            newLongitude,
            newLocationName,
            newLocationAddress,
            newLocationCity,
            newLocationRegion,
            newLocationType,
            moveReason
        } = req.body;

        if (!routerID) {
            return res.status(400).json({ success: false, message: 'Router ID is required' });
        }

        // Get current location
        const [current] = await db.execute(
            'SELECT location_name, latitude, longitude FROM mikrotiks WHERE router_id = ?',
            [routerID]
        );

        if (current.length === 0) {
            return res.status(404).json({ success: false, message: 'Router not found' });
        }

        const oldLocation = current[0];

        // Update router location
        await db.execute(
            `UPDATE mikrotiks SET 
                latitude = ?,
                longitude = ?,
                location_name = ?,
                location_address = ?,
                location_city = ?,
                location_region = ?,
                location_type = ?,
                last_moved_at = NOW()
            WHERE router_id = ?`,
            [
                newLatitude,
                newLongitude,
                newLocationName,
                newLocationAddress || '',
                newLocationCity || '',
                newLocationRegion || '',
                newLocationType || 'other',
                routerID
            ]
        );

        // Log to history
        await db.execute(
            `INSERT INTO router_location_history 
                (router_id, latitude, longitude, location_name, location_type, move_reason, moved_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
                routerID,
                newLatitude,
                newLongitude,
                newLocationName,
                newLocationType || 'other',
                moveReason || 'Location updated'
            ]
        );

        logger.info(`📍 Router ${routerID} moved from "${oldLocation.location_name}" to "${newLocationName}"`);

        res.json({
            success: true,
            message: `Router moved from "${oldLocation.location_name}" to "${newLocationName}"`,
            previousLocation: oldLocation,
            newLocation: {
                latitude: newLatitude,
                longitude: newLongitude,
                name: newLocationName
            }
        });

    } catch (error) {
        logger.error('Move router error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/auto-detect/map-data
 * Get all routers with locations for map display
 */
router.get('/map-data', async (req, res) => {
    try {
        const [routers] = await db.execute(
            `SELECT 
                router_id,
                router_name,
                host,
                status,
                latitude,
                longitude,
                location_name,
                location_address,
                location_city,
                location_region,
                location_type,
                ssid,
                model,
                setup_status,
                last_seen
            FROM mikrotiks 
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            ORDER BY location_name`
        );

        res.json({
            success: true,
            count: routers.length,
            routers
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/auto-detect/location-history/:routerID
 * Get movement history for a router
 */
router.get('/location-history/:routerID', async (req, res) => {
    try {
        const { routerID } = req.params;

        const [history] = await db.execute(
            `SELECT * FROM router_location_history 
            WHERE router_id = ? 
            ORDER BY moved_at DESC 
            LIMIT 50`,
            [routerID]
        );

        res.json({
            success: true,
            count: history.length,
            history
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
