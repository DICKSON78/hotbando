// routes/setupWizard.js
// Guided setup wizard for configuring MikroTik routers
// Auto-detects MikroTik and walks user through setup step-by-step

const express = require('express');
const logger = require('../utils/logger');
const router = express.Router();
const routerManager = require('../utils/routerManager');
const mikrotikService = require('../utils/mikrotik');
const db = require('../config/database');
const { adminAuth } = require('../middleware/authMiddleware');

// All setup routes require admin authentication
router.use(adminAuth);

// ============================================================================
// SETUP WIZARD - STEP-BY-STEP GUIDED CONFIGURATION
// ============================================================================

// Get current setup status for a router
router.get('/status/:routerID', async (req, res) => {
    try {
        const { routerID } = req.params;

        // Check if router exists in database
        const isNumericId = /^\d+$/.test(String(routerID));
        const [routers] = await db.execute(
            isNumericId ? 'SELECT * FROM mikrotiks WHERE id = ?' : 'SELECT * FROM mikrotiks WHERE router_id = ?',
            [isNumericId ? parseInt(routerID) : routerID]
        );

        if (routers.length === 0) {
            return res.json({
                success: true,
                status: 'not_registered',
                message: 'Router isjaa registered na system',
                steps: getSetupSteps(),
                currentStep: 0
            });
        }

        const router = routers[0];

        // Check connection
        let connectionStatus = 'offline';
        let routerInfo = null;
        try {
            const testResult = await mikrotikService.testConnection(routerID);
            if (testResult.success) {
                connectionStatus = 'online';
                routerInfo = testResult.data;
            }
        } catch (e) {
            connectionStatus = 'offline';
        }

        // Check configuration status
        let configStatus = null;
        try {
            configStatus = await routerManager.verifyConfiguration(routerID);
        } catch (e) {
            configStatus = { configured: false, checks: {} };
        }

        // Determine current step
        const currentStep = determineCurrentStep(router, connectionStatus, configStatus);

        res.json({
            success: true,
            router: {
                id: router.id,
                router_id: router.router_id,
                router_name: router.router_name,
                host: router.host,
                status: router.status,
                ssid: router.ssid
            },
            connection: connectionStatus,
            routerInfo,
            configuration: configStatus,
            steps: getSetupSteps(),
            currentStep,
            message: getStepMessage(currentStep)
        });

    } catch (error) {
        logger.error('Setup status error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to get setup status' });
    }
});

// Get detailed instructions for a specific step
router.get('/instructions/:routerID/:step', async (req, res) => {
    try {
        const { routerID, step } = req.params;
        const stepNum = parseInt(step);

        if (stepNum < 1 || stepNum > 7) {
            return res.status(400).json({ success: false, message: 'Invalid step number' });
        }

        const instructions = getStepInstructions(stepNum, routerID);
        res.json({ success: true, instructions });

    } catch (error) {
        logger.error('Instructions error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to get instructions' });
    }
});

// Execute a setup step (auto-configure)
router.post('/execute/:routerID/:step', async (req, res) => {
    try {
        const { routerID, step } = req.params;
        const stepNum = parseInt(step);
        const config = req.body;

        if (stepNum < 1 || stepNum > 7) {
            return res.status(400).json({ success: false, message: 'Invalid step number' });
        }

        let result;

        switch (stepNum) {
            case 1: // Register router
                result = await executeStep1_Register(routerID, config);
                break;
            case 2: // Test connection
                result = await executeStep2_TestConnection(routerID);
                break;
            case 3: // Configure hotspot
                result = await executeStep3_ConfigureHotspot(routerID, config);
                break;
            case 4: // Configure WiFi
                result = await executeStep4_ConfigureWiFi(routerID, config);
                break;
            case 5: // Save GPS location
                result = await executeStep5_SaveLocation(routerID, config);
                break;
            case 6: // Configure RADIUS
                result = await executeStep6_ConfigureRADIUS(routerID, config);
                break;
            case 7: // Test & verify
                result = await executeStep7_Verify(routerID);
                break;
            default:
                result = { success: false, message: 'Unknown step' };
        }

        res.json({
            success: result.success,
            step: stepNum,
            message: result.message,
            data: result.data,
            nextStep: result.success ? stepNum + 1 : stepNum,
            instructions: result.instructions || null
        });

    } catch (error) {
        logger.error('Execute step error:', error.message);
        res.status(500).json({ success: false, message: 'Step execution failed: ' + error.message });
    }
});

// Quick setup - configure everything at once
router.post('/quick-setup/:routerID', async (req, res) => {
    try {
        const { routerID } = req.params;
        const {
            routerName,
            serverIP,
            radiusSecret = process.env.RADIUS_SECRET || '',
            hotspotInterface = 'wlan1',
            hotspotIP = process.env.HOTSPOT_IP || '10.5.50.1',
            hotspotNet = process.env.HOTSPOT_SUBNET || '10.5.50.0',
            ssid = 'HotBando-Free-WiFi'
        } = req.body;

        logger.info(`🚀 Starting quick setup for router ${routerID}...`);

        // Step 1: Add/update router in database
        const addResult = await routerManager.addRouter({
            routerID,
            routerName: routerName || `Router-${routerID}`,
            host: req.body.host || '10.7.0.4',
            port: 8728,
            user: req.body.user || 'admin',
            password: req.body.password || 'admin',
            ssid
        });

        if (!addResult.success) {
            return res.json({
                success: false,
                message: 'Failed to add router: ' + addResult.message,
                step: 1,
                instructions: getStep1Instructions(routerID)
            });
        }

        // Step 2: Configure router
        const configResult = await routerManager.configureRouter(routerID, {
            serverIP,
            radiusSecret,
            hotspotInterface,
            hotspotIP,
            hotspotNet,
            ssid
        });

        if (!configResult.success) {
            return res.json({
                success: false,
                message: 'Configuration failed: ' + configResult.message,
                step: 3,
                data: configResult,
                instructions: getStep3Instructions(routerID)
            });
        }

        // Step 3: Verify
        const verifyResult = await routerManager.verifyConfiguration(routerID);

        res.json({
            success: true,
            message: 'Router configured successfully!',
            router: {
                routerID,
                routerName: routerName || `Router-${routerID}`,
                ssid,
                hotspotIP,
                serverIP
            },
            configuration: configResult,
            verification: verifyResult,
            nextSteps: [
                'Connect to WiFi: ' + ssid,
                'Open browser and test login',
                'Voucher zako ziko tayari kuuza!'
            ]
        });

    } catch (error) {
        logger.error('Quick setup error:', error.message);
        res.status(500).json({ success: false, message: 'Quick setup failed: ' + error.message });
    }
});

// Get all unconfigured routers (need setup)
router.get('/unconfigured', async (req, res) => {
    try {
        const [routers] = await db.execute(
            'SELECT * FROM mikrotiks WHERE setup_status != "configured" OR setup_status IS NULL ORDER BY created_at DESC'
        );

        const unconfigured = [];
        for (const router of routers) {
            let connectionStatus = 'offline';
            try {
                await mikrotikService.testConnection(router.router_id);
                connectionStatus = 'online';
            } catch (e) {
                connectionStatus = 'offline';
            }

            unconfigured.push({
                ...router,
                connectionStatus,
                needsSetup: true
            });
        }

        res.json({
            success: true,
            count: unconfigured.length,
            routers: unconfigured,
            message: unconfigured.length > 0
                ? `${unconfigured.length} router(s) need configuration`
                : 'All routers are configured'
        });

    } catch (error) {
        logger.error('Get unconfigured error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to get unconfigured routers' });
    }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSetupSteps() {
    return [
        {
            step: 1,
            name: 'Register Router',
            description: 'Ongeza router kwenye system',
            icon: '🔌',
            autoConfig: false,
            manualRequired: true
        },
        {
            step: 2,
            name: 'Test Connection',
            description: 'Test kama server inaweza kuconnect na router',
            icon: '🔗',
            autoConfig: true,
            manualRequired: false
        },
        {
            step: 3,
            name: 'Configure Hotspot',
            description: 'Weka hotspot server, DHCP, na captive portal',
            icon: '📡',
            autoConfig: true,
            manualRequired: false
        },
        {
            step: 4,
            name: 'Configure WiFi',
            description: 'Weka SSID na wireless settings',
            icon: '📶',
            autoConfig: true,
            manualRequired: false
        },
        {
            step: 5,
            name: 'Location',
            description: 'Weka GPS na eneo la router',
            icon: '📍',
            autoConfig: false,
            manualRequired: true
        },
        {
            step: 6,
            name: 'Configure RADIUS',
            description: 'Weka RADIUS server kwa authentication',
            icon: '🔐',
            autoConfig: true,
            manualRequired: false
        },
        {
            step: 7,
            name: 'Test & Verify',
            description: 'Thibitisha kila kitu kinafanya kazi',
            icon: '✅',
            autoConfig: true,
            manualRequired: false
        }
    ];
}

function determineCurrentStep(router, connectionStatus, configStatus) {
    if (!router) return 1;
    if (connectionStatus === 'offline') return 2;
    if (configStatus && configStatus.configured) return 7;
    if (configStatus && configStatus.checks.radius === 'ok') return 6;
    if (configStatus && configStatus.checks.hotspotServer === 'ok') return 5;
    if (configStatus && configStatus.checks.dhcp === 'ok') return 4;
    return 3;
}

function getStepMessage(step) {
    const messages = {
        1: 'Chomeka MikroTik na uconnect na server. Router itaji-register automatically.',
        2: 'Server inajaribu kuconnect na router. Hakikisha router iko online.',
        3: 'Inaconfigure hotspot server, DHCP, na captive portal.',
        4: 'Inaweka WiFi SSID na wireless settings.',
        5: 'Weka GPS coordinates na jina la eneo la router.',
        6: 'Inaweka RADIUS server kwa user authentication.',
        7: 'Inathibitisha kila kitu kinafanya kazi. Unaweza kuanza kutumia!'
    };
    return messages[step] || 'Unknown step';
}

function getStepInstructions(step, routerID) {
    const instructions = {
        1: getStep1Instructions(routerID),
        2: getStep2Instructions(routerID),
        3: getStep3Instructions(routerID),
        4: getStep4Instructions(routerID),
        5: getStep5Instructions(routerID),
        6: getStep6Instructions(routerID),
        7: getStep7Instructions(routerID)
    };
    return instructions[step] || {};
}

function getStep1Instructions(routerID) {
    return {
        title: '🔌 Hatua ya 1: Ongeza Router',
        description: 'Chomeka MikroTik na uconnect na internet',
        steps: [
            '1. Chomeka ethernet cable kwenye MikroTik port 1 (internet in)',
            '2. Wakisha WiFi iko on (wlan1 LED inaangaza)',
            '3. Router itaji-register automatically na server',
            '4. Au weka manual: admin/admin kwenye browser'
        ],
        manualSteps: [
            'Kama router haija-register automatically:',
            '1. Open WinBox/WebFig',
            '2. Connect na IP ya router (default: 192.168.88.1)',
            '3. Run script: /import file-name=mikrotik-auto-register.rsc',
            '4. Replace HOTBANDO_SERVER na IP ya server yako'
        ],
        expectedResult: 'Router inaonekana kwenye dashboard na status "online"',
        troubleshooting: [
            'Kama haionaoni router: check ethernet cable',
            'Kama haikii connect: weka IP ya server kwenye script',
            'Kama bado haifanyi: restart router'
        ]
    };
}

function getStep2Instructions(routerID) {
    return {
        title: '🔗 Hatua ya 2: Test Connection',
        description: 'Server inajaribu kuconnect na router',
        steps: [
            '1. Server ita-connect na router kupitia API (port 8728)',
            '2. Ita-test kama router in响应',
            '3. Itaonyesha: model, firmware, uptime'
        ],
        expectedResult: 'Connection successful, router info inaonekana',
        troubleshooting: [
            'Kama haikii connect: check IP address',
            'Kama port imeblock: open port 8728 kwenye firewall',
            'Kama credentials zimechange: update kwenye dashboard'
        ]
    };
}

function getStep3Instructions(routerID) {
    return {
        title: '📡 Hatua ya 3: Configure Hotspot',
        description: 'Inaweka hotspot server, DHCP, na captive portal',
        steps: [
            '1. Ina-create hotspot server profile',
            '2. Inaweka DHCP server (auto-assign IPs)',
            '3. Inaweka DNS settings',
            '4. Inaweka firewall NAT rules',
            '5. Inaweka walled garden (allow login page)'
        ],
        expectedResult: 'Hotspot server iko active, DHCP iko working',
        troubleshooting: [
            'Kama hotspot haifanyi: check interface name',
            'Kama IP haikii assign: check DHCP pool',
            'Kama DNS haifanyi: check DNS settings'
        ]
    };
}

function getStep4Instructions(routerID) {
    return {
        title: '📶 Hatua ya 4: Configure WiFi',
        description: 'Inaweka WiFi SSID na wireless settings',
        steps: [
            '1. Inaweka SSID (jina la WiFi)',
            '2. Inaweka security (WPA2/WPA3)',
            '3. Inaweka frequency/channel',
            '4. Ina-enable wireless interface'
        ],
        expectedResult: 'WiFi inaonekana kwenye simu/compuyter',
        troubleshooting: [
            'Kama WiFi haionekani: check wireless interface',
            'Kama haikii connect: check security settings',
            'Kama slow: change frequency/channel'
        ]
    };
}

function getStep5Instructions(routerID) {
    return {
        title: '📍 Hatua ya 5: Weka Eneo la Router',
        description: 'Weka GPS coordinates na taarifa za eneo',
        steps: [
            '1. Bonyeza "Pata GPS Location Sasa" kujaza coordinates automatically',
            '2. Au weka coordinates kwa mkono kutoka Google Maps',
            '3. Weka jina la eneo, mji na mkoa',
            '4. Hifadhi eneo la router kwenye ramani'
        ],
        expectedResult: 'Router inaonekana kwenye ramani na eneo limehifadhiwa',
        troubleshooting: [
            'Kama GPS haifanyi: weka coordinates kwa mkono',
            'Kama ramani haionekani: check internet connection'
        ]
    };
}

function getStep6Instructions(routerID) {
    return {
        title: '🔐 Hatua ya 6: Configure RADIUS',
        description: 'Inaweka RADIUS server kwa user authentication',
        steps: [
            '1. Ina-add RADIUS server (FreeRADIUS)',
            '2. Ina-enable RADIUS kwenye hotspot',
            '3. Inaweka RADIUS secret',
            '4. Ina-enable accounting'
        ],
        expectedResult: 'RADIUS server iko connected, authentication inafanya kazi',
        troubleshooting: [
            'Kama RADIUS haifanyi: check secret',
            'Kama port imeblock: open ports 1812, 1813, 1700',
            'Kama haikii authenticate: check FreeRADIUS logs'
        ]
    };
}

function getStep7Instructions(routerID) {
    return {
        title: '✅ Hatua ya 7: Test & Verify',
        description: 'Thibitisha kila kitu kinafanya kazi',
        steps: [
            '1. Connect to WiFi na simu/compuyter',
            '2. Open browser (itafunguka captive portal)',
            '3. Jisajili/login na nambari ya simu',
            '4. Thibitisha unapata internet'
        ],
        expectedResult: 'Unaweza kuingia internet baada ya login',
        troubleshooting: [
            'Kama captive portal haifanyi: check redirect URL',
            'Kama haikii login: check RADIUS connection',
            'Kama slow: check bandwidth limits'
        ]
    };
}

// ============================================================================
// STEP EXECUTION FUNCTIONS
// ============================================================================

async function executeStep1_Register(routerID, config) {
    try {
        const { host = '192.168.88.1', user = 'admin', password = process.env.MIKROTIK_DEFAULT_PASSWORD || 'admin', routerName, ssid } = config;

        const result = await routerManager.addRouter({
            routerID,
            routerName: routerName || `Router-${routerID}`,
            host,
            user,
            password,
            ssid: ssid || 'HotBando-Free-WiFi'
        });

        if (result.success) {
            return {
                success: true,
                message: 'Router imeongezwa kwenye system!',
                data: result.data,
                instructions: {
                    title: '✅ Router Imeongezwa!',
                    next: 'Sasa ita-connect na kuconfigure automatically',
                    note: 'Kama router haija-connect, check IP address na credentials'
                }
            };
        } else {
            return {
                success: false,
                message: 'Imeshindwa kuongeza router: ' + result.message,
                instructions: getStep1Instructions(routerID)
            };
        }
    } catch (error) {
        return {
            success: false,
            message: 'Error: ' + error.message,
            instructions: getStep1Instructions(routerID)
        };
    }
}

async function executeStep2_TestConnection(routerID) {
    try {
        const result = await mikrotikService.testConnection(routerID);

        if (result.success) {
            return {
                success: true,
                message: 'Connection successful!',
                data: result.data,
                instructions: {
                    title: '✅ Connection Imefanikiwa!',
                    routerInfo: result.data,
                    next: 'Sasa tutaweke configuration'
                }
            };
        } else {
            return {
                success: false,
                message: 'Connection failed: ' + result.message,
                instructions: getStep2Instructions(routerID)
            };
        }
    } catch (error) {
        return {
            success: false,
            message: 'Error: ' + error.message,
            instructions: getStep2Instructions(routerID)
        };
    }
}

async function executeStep3_ConfigureHotspot(routerID, config) {
    try {
        const {
            serverIP,
            radiusSecret = process.env.RADIUS_SECRET || '',
            hotspotInterface = 'wlan1',
            hotspotIP = process.env.HOTSPOT_IP || '10.5.50.1',
            hotspotNet = process.env.HOTSPOT_SUBNET || '10.5.50.0',
            ssid = 'HotBando-Free-WiFi'
        } = config;

        const result = await routerManager.configureRouter(routerID, {
            serverIP,
            radiusSecret,
            hotspotInterface,
            hotspotIP,
            hotspotNet,
            ssid
        });

        if (result.success) {
            return {
                success: true,
                message: 'Hotspot configured successfully!',
                data: result,
                instructions: {
                    title: '✅ Hotspot Imeconfigure!',
                    config: result.config,
                    next: 'Hotspot iko tayari, sasa test kwa kuconnect WiFi'
                }
            };
        } else {
            return {
                success: false,
                message: 'Configuration failed: ' + result.message,
                instructions: getStep3Instructions(routerID)
            };
        }
    } catch (error) {
        return {
            success: false,
            message: 'Error: ' + error.message,
            instructions: getStep3Instructions(routerID)
        };
    }
}

async function executeStep4_ConfigureWiFi(routerID, config) {
    try {
        const { ssid = 'HotBando-Free-WiFi', interfaceName = 'wlan1' } = config;

        // WiFi is configured as part of hotspot setup
        // This step just verifies and applies SSID
        const conn = await mikrotikService.getRouterConnection(routerID);

        // Set SSID
        await conn.write('/interface/wireless/set', [
            `=.id=${interfaceName}`,
            `=ssid=${ssid}`,
            '=mode=ap-bridge',
            '=disabled=no'
        ]);

        return {
            success: true,
            message: 'WiFi configured!',
            data: { ssid, interface: interfaceName },
            instructions: {
                title: '✅ WiFi Imeconfigure!',
                ssid,
                next: 'WiFi inaonekana kwenye simu/compuyter'
            }
        };
    } catch (error) {
        return {
            success: false,
            message: 'Error: ' + error.message,
            instructions: getStep4Instructions(routerID)
        };
    }
}

async function executeStep5_SaveLocation(routerID, config) {
    try {
        const {
            latitude,
            longitude,
            locationName,
            locationAddress,
            locationCity,
            locationRegion,
            locationType = 'other'
        } = config;

        if (!latitude || !longitude) {
            return {
                success: false,
                message: 'Weka GPS coordinates (latitude na longitude) kwanza',
                instructions: getStep5Instructions(routerID)
            };
        }

        // Check router exists
        const isNumericId = /^\d+$/.test(String(routerID));
        const [routers] = await db.execute(
            isNumericId ? 'SELECT id FROM mikrotiks WHERE id = ?' : 'SELECT id FROM mikrotiks WHERE router_id = ?',
            [isNumericId ? parseInt(routerID) : routerID]
        );

        if (routers.length === 0) {
            return {
                success: false,
                message: 'Router haijapatikana. Sajili router kwanza (Hatua ya 1).',
                instructions: getStep1Instructions(routerID)
            };
        }

        const whereClause = isNumericId ? 'id = ?' : 'router_id = ?';
        await db.execute(
            `UPDATE mikrotiks SET
                latitude = ?,
                longitude = ?,
                location_name = ?,
                location_address = ?,
                location_city = ?,
                location_region = ?,
                location_type = ?,
                setup_step = 5
            WHERE ${whereClause}`,
            [
                latitude,
                longitude,
                locationName || `Router-${routerID}`,
                locationAddress || '',
                locationCity || '',
                locationRegion || '',
                locationType,
                isNumericId ? parseInt(routerID) : routerID
            ]
        );

        // Log location history
        await db.execute(
            `INSERT INTO router_location_history
                (router_id, latitude, longitude, location_name, location_type, moved_at)
            VALUES (?, ?, ?, ?, ?, NOW())`,
            [routerID, latitude, longitude, locationName || `Router-${routerID}`, locationType]
        );

        return {
            success: true,
            message: 'Eneo limehifadhiwa!',
            data: { latitude, longitude, locationName: locationName || `Router-${routerID}` },
            instructions: {
                title: '✅ Eneo Limehifadhiwa!',
                location: { latitude, longitude, name: locationName || `Router-${routerID}` },
                next: 'Sasa tutaweka RADIUS configuration'
            }
        };
    } catch (error) {
        return {
            success: false,
            message: 'Error: ' + error.message,
            instructions: getStep5Instructions(routerID)
        };
    }
}

async function executeStep6_ConfigureRADIUS(routerID, config) {
    try {
        const {
            serverIP,
            radiusSecret = process.env.RADIUS_SECRET || ''
        } = config;

        if (!serverIP) {
            const isNumericId = /^\d+$/.test(String(routerID));
            const [routers] = await db.execute(
                isNumericId ? 'SELECT host FROM mikrotiks WHERE id = ?' : 'SELECT host FROM mikrotiks WHERE router_id = ?',
                [isNumericId ? parseInt(routerID) : routerID]
            );
            return {
                success: false,
                message: 'Server IP haijatolewa. Weka IP ya HotBando server kwenye Hatua ya 3.',
                instructions: getStep6Instructions(routerID)
            };
        }

        // RADIUS server + hotspot use-radius get applied as part of hotspot configuration
        // This step verifies and, if missing, re-applies the RADIUS pointing
        const verifyResult = await routerManager.verifyConfiguration(routerID);

        if (verifyResult.configured) {
            return {
                success: true,
                message: 'RADIUS configured!',
                data: verifyResult.checks,
                instructions: {
                    title: '✅ RADIUS Imeconfigure!',
                    checks: verifyResult.checks,
                    next: 'Authentication inafanya kazi'
                }
            };
        }

        // Try to (re)apply RADIUS config
        const configResult = await routerManager.configureRouter(routerID, {
            serverIP,
            radiusSecret,
            hotspotInterface: config.hotspotInterface || 'wlan1',
            hotspotIP: config.hotspotIP || process.env.HOTSPOT_IP || '10.5.50.1',
            hotspotNet: config.hotspotNet || process.env.HOTSPOT_SUBNET || '10.5.50.0',
            ssid: config.ssid || 'HotBando-Free-WiFi'
        });

        if (configResult.success) {
            return {
                success: true,
                message: 'RADIUS configured successfully!',
                data: configResult.config,
                instructions: {
                    title: '✅ RADIUS Imeconfigure!',
                    next: 'Authentication inafanya kazi'
                }
            };
        }

        return {
            success: false,
            message: 'RADIUS configuration failed: ' + configResult.message,
            instructions: getStep6Instructions(routerID)
        };
    } catch (error) {
        return {
            success: false,
            message: 'Error: ' + error.message,
            instructions: getStep6Instructions(routerID)
        };
    }
}

async function executeStep7_Verify(routerID) {
    try {
        const verifyResult = await routerManager.verifyConfiguration(routerID);

        if (verifyResult.configured) {
            return {
                success: true,
                message: '🎉 Router iko tayari kwa matumizi!',
                data: verifyResult,
                instructions: {
                    title: '🎉 Ukamilifu!',
                    checks: verifyResult.checks,
                    next: 'Unaweza kuanza kuuza bando!',
                    nextSteps: [
                        '1. Generate vouchers kwenye dashboard',
                        '2. Weka bei ya vouchers',
                        '3. Anza kuuza!',
                        '4. Fungua browser kwa URL: http://10.5.50.1',
                        '5. Login na: admin/' + (process.env.HOTSPOT_ADMIN_PASSWORD || 'hotbando2024')
                    ]
                }
            };
        } else {
            return {
                success: false,
                message: 'Configuration incomplete',
                data: verifyResult,
                instructions: getStep7Instructions(routerID)
            };
        }
    } catch (error) {
        return {
            success: false,
            message: 'Error: ' + error.message,
            instructions: getStep7Instructions(routerID)
        };
    }
}

module.exports = router;
