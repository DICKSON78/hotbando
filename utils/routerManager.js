// utils/routerManager.js
// Router lifecycle manager: register, configure (hotspot/DHCP/DNS/NAT/RADIUS), verify
const db = require('../config/database');
const mikrotikService = require('./mikrotik');
const logger = require('./logger');

const DEFAULT_HOTSPOT_INTERFACE = 'wlan1';
const DEFAULT_HOTSPOT_IP = process.env.HOTSPOT_IP || '10.5.50.1';
const DEFAULT_HOTSPOT_NET = process.env.HOTSPOT_SUBNET || '10.5.50.0';
const DEFAULT_SSID = 'HotBando-Free-WiFi';

function routerWhere(routerID) {
    const isNumericId = /^\d+$/.test(String(routerID));
    return {
        clause: isNumericId ? 'id = ?' : 'router_id = ?',
        value: isNumericId ? parseInt(routerID) : routerID
    };
}

/**
 * Register (or update) a router in the database
 */
async function addRouter({ routerID, routerName, host, port = 8728, user = 'admin', password = 'admin', ssid = DEFAULT_SSID }) {
    try {
        if (!routerID || !host) {
            return { success: false, message: 'Router ID and host are required' };
        }

        const [existing] = await db.execute(
            'SELECT id FROM mikrotiks WHERE router_id = ?',
            [routerID]
        );

        if (existing.length > 0) {
            await db.execute(
                `UPDATE mikrotiks SET
                    router_name = ?, host = ?, port = ?, \`user\` = ?, password = ?, ssid = ?
                WHERE router_id = ?`,
                [routerName || `Router-${routerID}`, host, port, user, password, ssid, routerID]
            );
            return { success: true, message: 'Router updated', data: { routerID, routerName: routerName || `Router-${routerID}` } };
        }

        const [result] = await db.execute(
            `INSERT INTO mikrotiks (router_id, router_name, host, port, \`user\`, password, ssid, status, setup_status, setup_step)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'offline', 'pending', 1)`,
            [routerID, routerName || `Router-${routerID}`, host, port, user, password, ssid]
        );

        return {
            success: true,
            message: 'Router registered successfully',
            data: { id: result.insertId, routerID, routerName: routerName || `Router-${routerID}` }
        };
    } catch (error) {
        logger.error('addRouter error:', error.message);
        return { success: false, message: error.message };
    }
}

/**
 * Configure a router with hotspot, DHCP, DNS, NAT, walled garden and RADIUS
 */
async function configureRouter(routerID, options = {}) {
    const {
        serverIP,
        radiusSecret = process.env.RADIUS_SECRET || '',
        hotspotInterface = DEFAULT_HOTSPOT_INTERFACE,
        hotspotIP = DEFAULT_HOTSPOT_IP,
        hotspotNet = DEFAULT_HOTSPOT_NET,
        ssid = DEFAULT_SSID,
        routerName
    } = options;

    if (!serverIP) {
        return { success: false, message: 'Server IP is required for RADIUS configuration' };
    }

    // HOTSPOT_SUBNET is often configured as "10.5.50.0" (no prefix).
    const hotspotCidr = String(hotspotNet || '').includes('/')
        ? String(hotspotNet)
        : `${hotspotNet || '10.5.50.0'}/24`;
    const [hotspotNetBase, hotspotPrefixLen = '24'] = hotspotCidr.split('/');
    const hotspotNetPrefix = hotspotNetBase.replace(/\.\d+$/, '');

    let conn;
    try {
        conn = await mikrotikService.getRouterConnection(routerID);
    } catch (error) {
        return { success: false, message: 'Cannot connect to router: ' + error.message };
    }

    const executed = [];
    const failed = [];

    async function run(label, command, params = []) {
        try {
            await conn.write(command, params);
            executed.push(label);
            logger.info(`✅ ${label} on ${routerID}`);
        } catch (error) {
            failed.push({ label, error: error.message });
            logger.error(`❌ ${label} on ${routerID}: ${error.message}`);
        }
    }

    // A hotspot created directly on a bridge *port* (wlan1) is bypassed by the
    // bridge. Resolve the bridge that contains the radio and put the hotspot
    // there instead, otherwise clients get plain internet with no portal.
    let hotspotIface = hotspotInterface;
    try {
        const ports = await conn.write('/interface/bridge/port/print');
        const port = ports.find(p => p.interface === hotspotInterface);
        if (port && port.bridge) {
            hotspotIface = port.bridge;
            logger.info(`ℹ️ ${hotspotInterface} is bridged; using ${hotspotIface} for the hotspot`);
        }
    } catch (e) {
        // No bridge package / no ports — keep the configured interface.
    }

    // Update setup progress
    const w = routerWhere(routerID);
    await db.execute(
        `UPDATE mikrotiks SET setup_status = "configuring", setup_step = 3 WHERE ${w.clause}`,
        [w.value]
    );

    // 1. System identity
    if (routerName) {
        await run('Set identity', '/system/identity/set', [`=name=${routerName}`]);
    }

    // 2. Hotspot IP address on the interface
    await run('Add hotspot IP address', '/ip/address/add', [
        `=address=${hotspotIP}/${hotspotPrefixLen}`,
        `=interface=${hotspotIface}`,
        `=comment=hotbando-hotspot`
    ]);

    // 3. DHCP pool + server + network
    await run('Add DHCP pool', '/ip/pool/add', [
        `=name=hotbando-pool`,
        `=ranges=${hotspotNetPrefix}.100-${hotspotNetPrefix}.200`
    ]);
    await run('Add DHCP network', '/ip/dhcp-server/network/add', [
        `=address=${hotspotCidr}`,
        `=gateway=${hotspotIP}`,
        `=dns-server=${hotspotIP}`
    ]);
    await run('Add DHCP server', '/ip/dhcp-server/add', [
        `=name=hotbando-dhcp`,
        `=interface=${hotspotIface}`,
        `=address-pool=hotbando-pool`,
        `=disabled=no`
    ]);

    // 4. DNS
    await run('Set DNS servers', '/ip/dns/set', [
        `=servers=1.1.1.1,8.8.8.8`,
        `=allow-remote-requests=yes`
    ]);

    // 4b. Captive-portal detection hosts -> hotspot gateway. Keep these OUT of
    // the walled garden so the phone's probe is intercepted and the OS opens
    // the portal instead of deciding that the internet already works.
    const captiveHosts = [
        'connectivitycheck.gstatic.com',
        'connectivitycheck.android.com',
        'captive.apple.com',
        'msftconnecttest.com',
        'www.msftconnecttest.com',
        'msftncsi.com',
        'www.msftncsi.com',
        'detectportal.firefox.com',
        'nmcheck.gnome.org'
    ];
    try {
        const statics = await conn.write('/ip/dns/static/print');
        for (const s of statics) {
            if (s.comment === 'HotBando captive') {
                await conn.write('/ip/dns/static/remove', [`=.id=${s['.id']}`]);
            }
        }
    } catch (e) { /* ignore */ }
    for (const host of captiveHosts) {
        await run(`Add captive DNS ${host}`, '/ip/dns/static/add', [
            `=name=${host}`,
            `=address=${hotspotIP}`,
            `=ttl=1m`,
            `=comment=HotBando captive`
        ]);
    }

    // 5. Hotspot server + profile
    await run('Add hotspot server', '/ip/hotspot/add', [
        `=name=hotspot1`,
        `=interface=${hotspotIface}`,
        `=address-pool=hotbando-pool`,
        `=addresses-per-mac=1`,
        `=disabled=no`
    ]);
    await run('Enable hotspot RADIUS in profile', '/ip/hotspot/profile/set', [
        `=[find default=yes]`,
        `=use-radius=yes`,
        `=html-directory=hotspot`,
        `=login-by=http-pap,http-chap`,
        `=trial-uptime=0s`
    ]);

    // 6. Firewall: NAT masquerade + walled garden
    await run('Add NAT masquerade', '/ip/firewall/nat/add', [
        `=chain=srcnat`,
        `=src-address=${hotspotCidr}`,
        `=out-interface=ether1`,
        `=action=masquerade`
    ]);

    // The portal host (and bare server IP) must be reachable before login.
    const portalHost = (() => {
        try {
            return new URL(process.env.PUBLIC_BASE_URL || process.env.APP_URL || `https://${process.env.SERVER_PUBLIC_HOST || 'hotbandowifi.online'}`).hostname;
        } catch (e) {
            return process.env.SERVER_PUBLIC_HOST || 'hotbandowifi.online';
        }
    })();
    const serverIp = process.env.SERVER_PUBLIC_IP || '';
    const portalHosts = [portalHost];
    if (!/^www\./i.test(portalHost)) portalHosts.push(`www.${portalHost}`);
    for (const host of portalHosts) {
        await run(`Allow portal host ${host}`, '/ip/hotspot/walled-garden/add', [
            `=dst-host=${host}`,
            `=action=allow`,
            `=comment=HotBando portal`
        ]);
    }
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(serverIp)) {
        await run('Allow portal IP', '/ip/hotspot/walled-garden/add', [
            `=dst-address=${serverIp}`,
            `=action=allow`,
            `=comment=HotBando portal`
        ]);
    }

    // 7. RADIUS server pointing to HotBando
    if (serverIP && radiusSecret) {
        await run('Add RADIUS server', '/radius/add', [
            `=service=hotspot`,
            `=address=${serverIP}`,
            `=secret=${radiusSecret}`,
            `=src-address=0.0.0.0`,
            `=timeout=3000ms`
        ]);
        await run('Enable RADIUS incoming', '/radius/incoming/set', [
            `=accept=yes`,
            `=port=1813`
        ]);
    }

    // 8. Wireless SSID (radio interface, not the bridge)
    //    RouterOS 6 exposes /interface/wireless; RouterOS 7 hAP ax uses
    //    /interface/wifi (wifi1, wifi2, ...). Try both so neither is missed.
    try {
        await conn.write('/interface/wireless/set', [
            `=.id=${hotspotInterface}`,
            `=ssid=${ssid}`,
            `=mode=ap-bridge`,
            `=disabled=no`
        ]);
        executed.push('Set wireless SSID (legacy)');
    } catch (e) {
        try {
            await conn.write('/interface/wifi/set', [
                `=.id=${hotspotInterface}`,
                `=ssid=${ssid}`,
                `=disabled=no`
            ]);
            executed.push('Set wireless SSID (RouterOS 7)');
        } catch (e2) {
            failed.push({ label: 'Set wireless SSID', error: e2.message });
            logger.error(`❌ Set wireless SSID on ${routerID}: ${e2.message}`);
        }
    }

    // Update router record
    await db.execute(
        `UPDATE mikrotiks SET ssid = ?, setup_status = ?, setup_step = ? WHERE ${w.clause}`,
        [ssid, 'configured', 5, w.value]
    );

    return {
        success: failed.length === 0 || executed.length > 0,
        message: failed.length === 0
            ? 'Router configured successfully'
            : `Configured with ${failed.length} warning(s)`,
        config: {
            serverIP,
            radiusSecretConfigured: !!(serverIP && radiusSecret),
            hotspotInterface,
            hotspotIP,
            hotspotNet,
            ssid
        },
        executed,
        failed
    };
}

/**
 * Verify a router's configuration status
 */
async function verifyConfiguration(routerID) {
    const checks = {
        hotspotServer: 'unknown',
        dhcp: 'unknown',
        radius: 'unknown',
        wifi: 'unknown'
    };

    let conn = null;
    try {
        conn = await mikrotikService.getRouterConnection(routerID);
    } catch (error) {
        return { configured: false, message: 'Router offline: ' + error.message, checks };
    }

    // Check hotspot server
    try {
        const hotspots = await conn.write('/ip/hotspot/print');
        const active = hotspots.find(h => h.disabled === 'false' || h.disabled === false || h.name === 'hotspot1');
        checks.hotspotServer = active ? 'ok' : 'not_configured';
    } catch (e) {
        checks.hotspotServer = 'error';
    }

    // Check DHCP server
    try {
        const dhcp = await conn.write('/ip/dhcp-server/print');
        checks.dhcp = dhcp.length > 0 ? 'ok' : 'not_configured';
    } catch (e) {
        checks.dhcp = 'error';
    }

    // Check RADIUS
    try {
        const radius = await conn.write('/radius/print');
        const radiusServer = radius.find(r => r.service === 'hotspot' || (r.service || '').includes('hotspot'));
        checks.radius = radiusServer ? 'ok' : 'not_configured';
    } catch (e) {
        checks.radius = 'error';
    }

    // Check wireless (RouterOS 6 /interface/wireless or RouterOS 7 /interface/wifi)
    try {
        const wireless = await conn.write('/interface/wireless/print');
        const wlan = wireless.find(w => w.disabled === 'false' || w.disabled === false);
        checks.wifi = wlan ? 'ok' : 'not_configured';
    } catch (e) {
        try {
            const wifi = await conn.write('/interface/wifi/print');
            const radio = wifi.find(w => w.disabled === 'false' || w.disabled === false);
            checks.wifi = radio ? 'ok' : 'not_configured';
        } catch (e2) {
            checks.wifi = 'error';
        }
    }

    const configured = checks.hotspotServer === 'ok' && checks.dhcp === 'ok';

    // Persist verified status
    if (configured) {
        const w = routerWhere(routerID);
        await db.execute(
            `UPDATE mikrotiks SET setup_status = "configured", setup_step = 6, setup_completed_at = COALESCE(setup_completed_at, NOW()), status = "online" WHERE ${w.clause}`,
            [w.value]
        );
    }

    return { configured, checks };
}

module.exports = {
    addRouter,
    configureRouter,
    verifyConfiguration
};
