/**
 * Router Zero-Touch Provisioning
 *
 * Two-phase flow so a layman just plugs in the router and the OWNER controls
 * when it goes live:
 *
 *   PHASE 1 — REGISTER (router phones home):
 *     Router boots, runs ONE bootstrap script. Server creates the router as
 *     PENDING (no WG peer yet, no real config) and returns a small "wait &
 *     poll" RouterOS script. The router now polls /provision/<id> periodically.
 *
 *   PHASE 2 — CONNECT (owner clicks a button from anywhere):
 *     Owner opens the admin panel in Dodoma, sees the PENDING router, clicks
 *     "Connect". Server adds the WG peer, marks the router CONFIGURING, and the
 *     next poll from the router downloads the FULL provisioning script and
 *     imports it → WG tunnel up → heartbeat → router shows ONLINE.
 *
 * After WG is up the server manages the router over the tunnel
 * (host = assigned WG IP), so it can be configured from anywhere in Tanzania,
 * not just from the LAN it sits on.
 */

const db = require('../config/database');
const wireguardService = require('./wireguard');
const logger = require('./logger');

const ROUTER_REGISTRATION_SECRET = process.env.ROUTER_REGISTRATION_SECRET || process.env.RADIUS_SECRET || '';
const SERVER_PUBLIC_IP = process.env.SERVER_PUBLIC_IP || '34.35.81.196';
const SERVER_PORT = process.env.PORT || 3000;
const RADIUS_SECRET = process.env.RADIUS_SECRET || '';
const DEFAULT_SSID = process.env.DEFAULT_SSID || 'HotBando-Free-WiFi';
const HOTSPOT_IP = process.env.HOTSPOT_IP || '10.5.50.1';
const HOTSPOT_NET = process.env.HOTSPOT_SUBNET || '10.5.50.0/24';
const HOTSPOT_DNS = process.env.HOTSPOT_DNS || '8.8.8.8';

function sanitize(value) {
    return String(value || '').replace(/([\\"])/g, '\\$1');
}

/**
 * Resolve (and create if needed) the router record by serial number.
 * Returns { router, created }
 */
async function resolveRouter({ serial, identity, model, firmware, publicIp, routerId, locationId }) {
    let router = null;
    let created = false;

    if (routerId) {
        const [rows] = await db.execute(
            'SELECT * FROM mikrotiks WHERE router_id = ? OR serial_number = ? LIMIT 1',
            [routerId, serial || null]
        );
        router = rows[0] || null;
    }

    if (!router && serial) {
        const [rows] = await db.execute(
            'SELECT * FROM mikrotiks WHERE serial_number = ? LIMIT 1', [serial]
        );
        router = rows[0] || null;
    }

    if (!router) {
        const id = routerId || `HB-${String(serial || Date.now()).replace(/[^A-Za-z0-9_-]/g, '').substring(0, 24)}`;
        const name = identity || `HotBando ${id}`;
        const [result] = await db.execute(
            `INSERT INTO mikrotiks
                (router_id, router_name, host, port, \`user\`, password, ssid, status, setup_status, setup_step,
                 serial_number, model, firmware_version, location_id)
             VALUES (?, ?, ?, 8728, 'admin', 'admin', ?, 'offline', 'pending', 1, ?, ?, ?, ?)`,
            [id, name, `10.7.0.2`, DEFAULT_SSID, serial || null, model || null, firmware || null, locationId || null]
        );
        const [rows] = await db.execute('SELECT * FROM mikrotiks WHERE id = ?', [result.insertId]);
        router = rows[0] || null;
        created = true;
    }

    return { router, created };
}

/**
 * PHASE 1 — Register a router as PENDING.
 * Assigns WG IP + keys (reserved for later), returns a light "wait & poll"
 * RouterOS script. Does NOT add the WG peer to the server yet.
 */
async function registerRouter(payload = {}) {
    const { serial, identity, model, firmware, publicIp, routerId, locationId, ssid } = payload;

    if (!serial && !routerId) {
        throw new Error('serial_number is required');
    }

    const { router, created } = await resolveRouter({ serial, identity, model, firmware, publicIp, routerId, locationId });
    const routerID = router.router_id;

    // Ensure WireGuard keys + IP assigned (idempotent)
    if (!router.wireguard_public_key || !router.wireguard_private_key) {
        const keypair = wireguardService.generateKeyPair();
        const presharedKey = wireguardService.generatePresharedKey();

        if (!router.wireguard_ip) {
            const assignedIp = await wireguardService.getNextAvailableIp();
            await wireguardService.saveRouterWireGuard(routerID, assignedIp, keypair.publicKey, keypair.privateKey, presharedKey);
        } else {
            await db.execute(
                `UPDATE mikrotiks SET wireguard_public_key = ?, wireguard_private_key = ?, wireguard_preshared_key = ?, wireguard_configured = 1 WHERE router_id = ?`,
                [keypair.publicKey, keypair.privateKey, presharedKey, routerID]
            );
        }
    }

    const [rows] = await db.execute('SELECT * FROM mikrotiks WHERE router_id = ?', [routerID]);
    const current = rows[0];

    // Keep PENDING — not part of the live tunnel yet
    await db.execute(
        `UPDATE mikrotiks SET status = 'offline', setup_status = 'pending', setup_step = 1,
            ssid = COALESCE(?, ssid), last_seen = NOW()
         WHERE router_id = ?`,
        [ssid || null, routerID]
    );

    const waitScript = generateWaitScript({
        routerID,
        routerName: current.router_name || routerID,
        assignedIp: current.wireguard_ip
    });

    return {
        router: current,
        assignedIp: current.wireguard_ip,
        serverPublicIp: SERVER_PUBLIC_IP,
        wgPort: wireguardService.listenPort,
        wgNetwork: wireguardService.networkCidr,
        ssid: ssid || current.ssid || DEFAULT_SSID,
        script: waitScript,
        pending: true,
        created
    };
}

/**
 * PHASE 2 — Connect/approve a PENDING router.
 * Owner clicked CONNECT: adds the WG peer on the server, marks the router
 * CONFIGURING so the next poll (2–5 min) downloads the full script.
 */
async function connectRouter(routerID, payload = {}) {
    const { ssid } = payload;

    const [rows] = await db.execute('SELECT * FROM mikrotiks WHERE router_id = ?', [routerID]);
    if (!rows.length) throw new Error('Router not found');
    const router = rows[0];

    if (!router.wireguard_public_key || !router.wireguard_private_key || !router.wireguard_ip) {
        const keypair = wireguardService.generateKeyPair();
        const presharedKey = wireguardService.generatePresharedKey();
        const assignedIp = router.wireguard_ip || await wireguardService.getNextAvailableIp();
        await wireguardService.saveRouterWireGuard(routerID, assignedIp, keypair.publicKey, keypair.privateKey, presharedKey);
    }

    const [fresh] = await db.execute('SELECT * FROM mikrotiks WHERE router_id = ?', [routerID]);
    const current = fresh[0];
    const assignedIp = current.wireguard_ip;

    // Add WG peer to the server + apply tunnel config
    const peerResult = await wireguardService.addPeerToServer(routerID, current.wireguard_public_key, assignedIp);
    if (!peerResult.success) {
        logger.error('connectRouter: addPeerToServer failed:', peerResult.message);
        throw new Error('Failed to add WireGuard peer: ' + (peerResult.message || 'unknown'));
    }

    // Set management host = WG IP (tunnel management, configurable from anywhere)
    // status uses the ENUM (offline until the router heartbeats ONLINE once configured)
    await db.execute(
        `UPDATE mikrotiks SET host = ?, status = 'offline', setup_status = 'configuring', setup_step = 2,
            last_seen = NOW(), ssid = COALESCE(?, ssid)
         WHERE router_id = ?`,
        [assignedIp, ssid || null, routerID]
    );

    const [final] = await db.execute('SELECT * FROM mikrotiks WHERE router_id = ?', [routerID]);
    const result = final[0];

    return {
        router: result,
        routerId: routerID,
        assignedIp,
        wireguardIp: assignedIp,
        serverPublicKey: wireguardService.ensureServerKeys().publicKey,
        serverPublicIp: SERVER_PUBLIC_IP,
        wgPort: wireguardService.listenPort,
        wgNetwork: wireguardService.networkCidr,
        status: 'configuring',
        script: generateProvisionScript({
            router: result,
            routerID,
            assignedIp,
            wireguard: {
                routerPublicKey: current.wireguard_public_key,
                routerPrivateKey: current.wireguard_private_key,
                serverPublicKey: wireguardService.ensureServerKeys().publicKey,
                presharedKey: current.wireguard_preshared_key
            }
        })
    };
}

/**
 * One-touch site bootstrap: dynamic version of
 * freeradius/mikrotik-zero-touch.ready.rsc with the CURRENT server
 * IP/port/secret baked in. Admin copies it (or sends via WhatsApp);
 * the site person pastes once into WebFig Terminal on the fresh router.
 * Everything after that is automatic (register → Connect → provision).
 */
function generateBootstrapScript() {
    return `# ============================================================================
# HotBando Zero-Touch Bootstrap — paste ONCE into WebFig Terminal
# (http://192.168.88.1 on a fresh router with internet on its WAN)
# Server: ${SERVER_PUBLIC_IP}:${SERVER_PORT}
# After this import everything is automatic: register → owner Connect → full config.
# ============================================================================

:global hotbandoServer "${SERVER_PUBLIC_IP}"
:global hotbandoPort "${SERVER_PORT}"
:global hotbandoSecret "${ROUTER_REGISTRATION_SECRET}"
:global hbSerial [/system routerboard get serial-number]
:global hbIdentity [/system identity get name]
:global hbModel [/system resource get board-name]
:global hbFirmware [/system resource get version]

:put "============================================="
:put "HotBando Zero-Touch Setup"
:put ("Serial: " . $hbSerial)
:put "============================================="

:global hbRegUrl ("http://" . $hotbandoServer . ":" . $hotbandoPort . "/api/zero-touch/register?secret=" . $hotbandoSecret . "&serial=" . $hbSerial)

/tool fetch url=$hbRegUrl dst-path="hotbando-provision.rsc" mode=http output=none
:delay 2

:if ([:len [/file find name="hotbando-provision.rsc"]] = 0) do={
    :put "ERROR: could not download provisioning script!"
    :put "Check internet on the router, server IP/port, and secret."
    :error "HotBando phone-home failed"
}

:put "Applying HotBando configuration..."
/import file-name="hotbando-provision.rsc"

:put "============================================="
:put "HotBando setup complete. Router is PENDING."
:put "Owner: open the admin panel > Fleet > Connect."
:put "============================================="
`;
}
function generateWaitScript({ routerID, routerName, assignedIp }) {
    return `
# ============================================================================
# HotBando Router — REGISTERED, awaiting CONNECT approval
# Router: ${routerID}  — ${sanitize(routerName)}
# Reserved WireGuard IP: ${assignedIp}
# The owner must click CONNECT in the HotBando panel. This router will poll
# every 2 minutes and pull + apply the full config automatically.
# ============================================================================

:global hbRouterId "${sanitize(routerID)}"
:global hbPollUrl ("http://${SERVER_PUBLIC_IP}:${SERVER_PORT}/api/zero-touch/provision/" . $hbRouterId . "?secret=${ROUTER_REGISTRATION_SECRET}")

:put ("HotBando registered: " . $hbRouterId . " — waiting for CONNECT approval")

/system scheduler remove [find name="hotbando-poll"]
/system scheduler add name="hotbando-poll" interval=2m start-time=startup on-event={
  :local tmp "hb-latest.rsc"
  :local size 0
  /tool fetch url=$hbPollUrl dst-path=$tmp mode=http
  :delay 2
  :set size [/file get [$tmp] size]
  :if ($size > 300) do={
    :put "HotBando: pulling approved configuration (${routerID})"
    :log info ("HotBando pulling approved configuration for " . $hbRouterId)
    /import file-name=$tmp
    :delay 2
    /file remove $tmp
  }
} comment="HotBando poll for approval"

# Also keep a heartbeat-style ping so the panel can see the router attempted
/system scheduler remove [find name="hotbando-heartbeat"]
/system scheduler add name="hotbando-heartbeat" interval=1h start-time=00:05:00 on-event={
  /tool fetch url="http://${SERVER_PUBLIC_IP}:${SERVER_PORT}/api/zero-touch/heartbeat" mode=http http-method=post http-content-type="application/json" http-data="{\\\"router_id\\\":\\\"${routerID}\\\",\\\"secret\\\":\\\"${ROUTER_REGISTRATION_SECRET}\\\"}"
} comment="HotBando heartbeat"

:put "Polling for approval every 2 minutes..."
`;
}

/**
 * Provision a router end-to-end and return the generated RouterOS script.
 * (Used when serving the FULL config to an approved router.)
 */
async function provisionRouter(payload = {}) {
    const {
        serial, identity, model, firmware, publicIp, routerId, locationId, ssid
    } = payload;

    if (!serial && !routerId) {
        throw new Error('serial_number or router_id is required');
    }

    const { router } = await resolveRouter({ serial, identity, model, firmware, publicIp, routerId, locationId });
    const routerID = router.router_id;

    // PENDING routers only get the wait script; approved routers get full config
    if (router.setup_status === 'pending') {
        const waitScript = generateWaitScript({
            routerID,
            routerName: router.router_name || routerID,
            assignedIp: router.wireguard_ip
        });
        return { router, assignedIp: router.wireguard_ip, script: waitScript, pending: true };
    }

    const [rows] = await db.execute('SELECT * FROM mikrotiks WHERE router_id = ?', [routerID]);
    const current = rows[0];
    if (!current) throw new Error('Router not found after resolve');

    const assignedIp = current.wireguard_ip || await wireguardService.getNextAvailableIp();

    const serverKeys = wireguardService.ensureServerKeys();

    // Ensure the WG peer is present on the server (re-applying configs can re-trigger)
    await wireguardService.addPeerToServer(routerID, current.wireguard_public_key, assignedIp);

    await db.execute(
        `UPDATE mikrotiks SET host = ?, status = 'online', last_seen = NOW(), setup_status = 'configured', setup_step = 3,
            ssid = COALESCE(?, ssid)
         WHERE router_id = ?`,
        [assignedIp, ssid || null, routerID]
    );

    const script = generateProvisionScript({
        router: current,
        routerID,
        assignedIp,
        wireguard: {
            routerPublicKey: current.wireguard_public_key,
            routerPrivateKey: current.wireguard_private_key,
            serverPublicKey: serverKeys.publicKey,
            presharedKey: current.wireguard_preshared_key
        }
    });

    return {
        router: current,
        assignedIp,
        serverPublicKey: serverKeys.publicKey,
        serverPublicIp: SERVER_PUBLIC_IP,
        wgPort: wireguardService.listenPort,
        wgNetwork: wireguardService.networkCidr,
        radiusSecret: RADIUS_SECRET,
        ssid: ssid || current.ssid || DEFAULT_SSID,
        script,
        created: false
    };
}

/**
 * Build the full RouterOS provisioning script from the bootstrap template.
 */
function generateProvisionScript({ router, routerID, assignedIp, wireguard }) {
    const serverKeys = wireguardService.ensureServerKeys();
    const ssid = router.ssid || DEFAULT_SSID;
    const hotspotNetBase = HOTSPOT_NET.replace(/\/.*$/, '');
    // First 3 octets for pool ranges (e.g., 10.5.50 from 10.5.50.0)
    const hotspotNetPrefix = hotspotNetBase.replace(/\.\d+$/, '');

    return `
# ============================================================================
# HotBando Router Auto-Provisioning Script  (generated by server)
# Router: ${routerID}  — ${router.router_name}
# WireGuard IP: ${assignedIp}
# Do NOT edit manually. Generated at: ${new Date().toISOString()}
# ============================================================================

# ----------------------------------------------------------------------------
# 0. SYSTEM IDENTITY
# ----------------------------------------------------------------------------
/system identity set name="${sanitize(router.router_name || routerID)}"

# ----------------------------------------------------------------------------
# 1. INTERFACE DETECTION
#    WAN   = first ether with a gateway/default route (uplink to modem)
#    HOTSPOT = wifi interface or a bridge that contains wlan1 (client-facing)
# ----------------------------------------------------------------------------
:local wanIface ""
:local hotspotIface ""

# Detect WAN: pick first running ether interface
:local wanList [/interface ethernet find running=yes]
:if ([:len $wanList] > 0) do={
  :set wanIface [/interface ethernet get ($wanList->0) name]
}
:if ([:len $wanIface] = 0) do={ :set wanIface "ether1" }

# Detect hotspot interface: the bridge that contains wlan1, else wlan1 itself
:if ([:len [/interface wireless find name="wlan1"] ] > 0) do={
  :local bridgeFound ""
  :local bridgeList [/interface bridge find]
  :foreach b in=$bridgeList do={
    :local bname [/interface bridge get $b name]
    :local portList [/interface bridge port find bridge=$bname]
    :foreach p in=$portList do={
      :local pname [/interface bridge port get $p interface]
      :if ($pname = "wlan1") do={ :set bridgeFound $bname }
    }
  }
  :if ([:len $bridgeFound] > 0) do={
    :set hotspotIface $bridgeFound
    # Ensure wlan1 is in the bridge
    :if ([:len [/interface bridge port find bridge=$bridgeFound interface=wlan1]] = 0) do={
      /interface bridge port add bridge=$bridgeFound interface=wlan1
    }
  } else={
    :set hotspotIface "wlan1"
  }
} else={
  # Fallback
  :if ([:len [/interface find name="bridge1"] ] > 0) do={ :set hotspotIface "bridge1" } else={ :set hotspotIface "wlan1" }
}

:put ("WAN interface: " . $wanIface)
:put ("Hotspot interface: " . $hotspotIface)

# ----------------------------------------------------------------------------
# 2. WIREGUARD TUNNEL TO HOTBANDO SERVER
# ----------------------------------------------------------------------------
/interface wireguard remove [find name="wg-hotbando"]
/interface wireguard add name="wg-hotbando" listen-port=13231 private-key="${wireguard.routerPrivateKey}"

/interface wireguard peers remove [find interface="wg-hotbando"]
/interface wireguard peers add \\
  interface="wg-hotbando" \\
  public-key="${wireguard.serverPublicKey}" \\
  endpoint-address=${SERVER_PUBLIC_IP} \\
  endpoint-port=${wireguardService.listenPort || 51820} \\
  allowed-address=${wireguardService.serverIp}/32 \\
  persistent-keepalive=25s

/ip address add address=${assignedIp}/32 interface="wg-hotbando"
/ip route add dst-address=${wireguardService.serverIp}/32 gateway="wg-hotbando"

# Firewall: allow WG + restrict API to tunnel
/ip firewall filter remove [find comment="HotBando WG"]
/ip firewall filter add chain=input protocol=udp dst-port=13231 action=accept comment="HotBando WG"
/ip firewall filter add chain=forward in-interface="wg-hotbando" action=accept comment="HotBando WG"
/ip firewall filter add chain=forward out-interface="wg-hotbando" action=accept comment="HotBando WG"
/ip service set api address=${wireguardService.networkCidr}
/ip service set winbox address=${wireguardService.networkCidr}

# ----------------------------------------------------------------------------
# 3. HOTSPOT + DHCP + DNS + NAT + RADIUS  (same as full bootstrap)
# ----------------------------------------------------------------------------
# Create/ensure hotspot bridge exists and contains wlan1
:if ([:len [/interface bridge find name=$hotspotIface]] = 0) do={
  /interface bridge add name=$hotspotIface disabled=no comment="HotBando hotspot"
  :if ([:len [/interface wireless find name="wlan1"] ] > 0) do={
    /interface bridge port add bridge=$hotspotIface interface=wlan1
  }
} else={
  # Ensure wlan1 is in the bridge
  :if ([:len [/interface wireless find name="wlan1"] ] > 0) do={
    :if ([:len [/interface bridge port find bridge=$hotspotIface interface=wlan1]] = 0) do={
      /interface bridge port add bridge=$hotspotIface interface=wlan1
    }
  }
}

/ip dhcp-server remove [find interface=$hotspotIface]
/ip address remove [find interface=$hotspotIface]
/ip address add address=${HOTSPOT_IP}/24 interface=$hotspotIface network=${hotspotNetBase} comment="HotBando hotspot gateway"

/ip pool remove [find name="hotbando-pool"]
/ip pool add name="hotbando-pool" ranges=${hotspotNetPrefix}.100-${hotspotNetPrefix}.200 comment="HotBando client pool"
/ip dhcp-server remove [find name="hotbando-dhcp"]
/ip dhcp-server add name="hotbando-dhcp" interface=$hotspotIface address-pool=hotbando-pool lease-time=1h disabled=no comment="HotBando DHCP"
/ip dhcp-server network remove [find address=${HOTSPOT_NET}]
/ip dhcp-server network add address=${HOTSPOT_NET} gateway=${HOTSPOT_IP} dns-server=${HOTSPOT_DNS}

/ip dns set allow-remote-requests=yes servers=${HOTSPOT_DNS}
/ip dns static remove [find comment="HotBando captive"]
/ip dns static add name="connectivitycheck.gstatic.com" address=${HOTSPOT_IP} ttl=1m comment="HotBando captive"
/ip dns static add name="captive.apple.com" address=${HOTSPOT_IP} ttl=1m comment="HotBando captive"
/ip dns static add name="msftconnecttest.com" address=${HOTSPOT_IP} ttl=1m comment="HotBando captive"
/ip dns static add name="msftncsi.com" address=${HOTSPOT_IP} ttl=1m comment="HotBando captive"

/ip firewall nat remove [find comment="HotBando masquerade"]
/ip firewall nat add chain=srcnat out-interface=$wanIface action=masquerade comment="HotBando masquerade"
/ip firewall nat add chain=dstnat protocol=tcp dst-port=80 in-interface=$wanIface action=dst-nat to-addresses=${HOTSPOT_IP} to-ports=80 comment="HotBando http"
/ip firewall nat add chain=dstnat protocol=tcp dst-port=443 in-interface=$wanIface action=dst-nat to-addresses=${HOTSPOT_IP} to-ports=80 comment="HotBando https"
/ip firewall filter add chain=input protocol=udp dst-port=53 in-interface=$hotspotIface action=accept comment="HotBando DNS"
/ip firewall filter add chain=input protocol=tcp dst-port=53 in-interface=$hotspotIface action=accept comment="HotBando DNS"

/ip hotspot remove [find]
/ip hotspot profile remove [find name="hotbando-profile"]
/ip hotspot profile add name="hotbando-profile" \\
  login-by=http-pap,http-chap \\
  html-directory=hotspot \\
  use-radius=yes radius-accounting=yes radius-interim-update=30s \\
  radius-mac-format=XX:XX:XX:XX:XX:XX \\
  mac-auth-mode=as-username-and-password \\
  hotspot-address=${HOTSPOT_IP} dns-name="hotspot.hotbando.local" \\
  comment="HotBando hotspot profile"
/ip hotspot add name="hotbando-server" interface=$hotspotIface address-pool=hotbando-pool profile=hotbando-profile disabled=no comment="HotBando hotspot server"

/ip hotspot walled-garden remove [find]
/ip hotspot walled-garden add action=allow dst-address=${SERVER_PUBLIC_IP} comment="HotBando server"
/ip hotspot walled-garden add action=allow dst-address=${SERVER_PUBLIC_IP} dst-port=80,443 comment="HotBando web"
/ip hotspot walled-garden add action=allow dst-port=53 comment="HotBando DNS"
/ip hotspot walled-garden add action=allow dst-address=${HOTSPOT_IP} comment="HotBando gateway"
/ip hotspot walled-garden add action=allow dst-host="connectivitycheck.gstatic.com" comment="HotBando captive"
/ip hotspot walled-garden add action=allow dst-host="captive.apple.com" comment="HotBando captive"
/ip hotspot walled-garden add action=allow dst-host="msftconnecttest.com" comment="HotBando captive"
/ip hotspot walled-garden add action=allow dst-host="msftncsi.com" comment="HotBando captive"
/ip hotspot walled-garden add action=allow dst-host="www.msftconnecttest.com" comment="HotBando captive"
/ip hotspot walled-garden add action=allow dst-host="www.google.com" comment="HotBando captive"
/ip hotspot walled-garden add action=allow dst-host="generate_204" comment="HotBando captive"
# Portal CDN (Tailwind, fonts, icons) so the login page renders fully
# inside the phone captive browser before login
/ip hotspot walled-garden add action=allow dst-host="cdn.tailwindcss.com" comment="HotBando portal CSS"
/ip hotspot walled-garden add action=allow dst-host="fonts.googleapis.com" comment="HotBando portal fonts"
/ip hotspot walled-garden add action=allow dst-host="fonts.gstatic.com" comment="HotBando portal fonts"
/ip hotspot walled-garden add action=allow dst-host="cdnjs.cloudflare.com" comment="HotBando portal icons"
/ip hotspot walled-garden add action=allow dst-host="unpkg.com" comment="HotBando portal libs"
/ip hotspot walled-garden add action=allow dst-host="cdn.jsdelivr.net" comment="HotBando portal libs"

/radius remove [find]
/radius add address=${SERVER_PUBLIC_IP} secret=${RADIUS_SECRET} service=hotspot \\
  authentication-port=1812 accounting-port=1813 timeout=3000ms src-address=0.0.0.0 \\
  comment="HotBando FreeRADIUS"
/radius incoming set accept=yes port=1700

/ip hotspot user profile remove [find]
/ip hotspot user profile add name="hotbando-free" rate-limit="3M/3M 512K/512K 2000/2000" idle-timeout=30m session-time-limit=2h comment="HotBando free"
/ip hotspot user profile add name="hotbando-paid" rate-limit="12M/12M 1M/1M 5000/5000" idle-timeout=1h session-time-limit=24h comment="HotBando paid"
/ip hotspot user profile add name="hotbando-vip" rate-limit="50M/50M 5M/5M 10000/10000" idle-timeout=2h session-time-limit=168h comment="HotBando VIP"

/ip hotspot user remove [find]
/ip hotspot user add name="admin" password="hotbando2024" profile=hotbando-vip server=hotbando-server comment="HotBando admin"

/ip hotspot ip-binding remove [find]
/ip hotspot ip-binding add mac-address="00:00:00:00:00:00" type=bypassed comment="HotBando bypass"

/system scheduler remove [find name="hotbando-watchdog"]
/system scheduler add name="hotbando-watchdog" interval=5m on-event={/ip hotspot set [find name=hotbando-server] disabled=no} comment="HotBando watchdog"

# ----------------------------------------------------------------------------
# 4. WIFI SSID
# ----------------------------------------------------------------------------
:foreach w in=[/interface wireless find] do={
  /interface wireless set $w ssid="${sanitize(ssid)}" mode=ap-bridge disabled=no
}

# ----------------------------------------------------------------------------
# 5. HEARTBEAT + REMOTE CONFIG PULL
#    Phones home hourly. The server can push updated config via the
#    /api/zero-touch/provision endpoint when router settings change.
# ----------------------------------------------------------------------------
# Stop the approval poller — config is now applied
/system scheduler remove [find name="hotbando-poll"]
:global hbPollUrl ""

/system scheduler remove [find name="hotbando-heartbeat"]
/system scheduler add name="hotbando-heartbeat" interval=1h start-time=00:05:00 on-event={
  /tool fetch url="http://${SERVER_PUBLIC_IP}:${SERVER_PORT}/api/zero-touch/heartbeat" mode=http http-method=post http-content-type="application/json" http-data="{\\\"router_id\\\":\\\"${routerID}\\\",\\\"secret\\\":\\\"${ROUTER_REGISTRATION_SECRET}\\\"}"
} comment="HotBando heartbeat"

# ----------------------------------------------------------------------------
# 6. CAPTIVE PORTAL REDIRECT PAGE
# ----------------------------------------------------------------------------
:delay 1
/file remove hotspot/login.html
:local loginHtml "<!-- HotBando -->\\n<html>\\n<head>\\n<meta http-equiv='refresh' content='0;url=https://${SERVER_PUBLIC_IP}/hotspot?router_id=${routerID}'>\\n</head>\\n<body>HotBando - connecting...</body>\\n</html>\\n"
/file add name="hotspot/login.html" contents=$loginHtml

:put "============================================="
:put "HotBando router provisioned successfully!"
:put "Router: ${routerID}  WG IP: ${assignedIp}"
:put "SSID: ${sanitize(ssid)}"
:put "============================================="
`;
}

module.exports = {
    registerRouter,
    connectRouter,
    provisionRouter,
    generateProvisionScript,
    generateBootstrapScript,
    ROUTER_REGISTRATION_SECRET
};