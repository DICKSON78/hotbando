/**
 * WireGuard Service — Self-contained (no external VPS dependency)
 * The HotBando server itself is the WireGuard hub.
 * MikroTik routers connect as peers over the public internet.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const logger = require('./logger');

const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
const WG_PORT = parseInt(process.env.WG_PORT) || 51820;
const WG_NETWORK = process.env.WG_NETWORK || '10.7.0.0/16';
const WG_SERVER_IP = process.env.WG_SERVER_IP || '10.7.0.1';
// Public uplink iface for NAT masquerade (GCP=ens4, DigitalOcean=eth0)
const WG_PUBLIC_IFACE = process.env.WG_PUBLIC_IFACE || 'ens4';

// Container paths: use shared volume for host-side WG management
// /host-wireguard maps to /etc/wireguard on the host
const WG_HOST_DIR = fs.existsSync('/host-wireguard') ? '/host-wireguard' : '/etc/wireguard';
const WG_KEYS_DIR = path.join(WG_HOST_DIR, 'hotbando-keys');
const SERVER_PUBLIC_KEY_FILE = path.join(WG_KEYS_DIR, 'server.key.pub');
const SERVER_PRIVATE_KEY_FILE = path.join(WG_KEYS_DIR, 'server.key');
const WG_CONF = path.join(WG_HOST_DIR, `${WG_INTERFACE}.conf`);
const WG_STATUS_FILE = process.env.WG_STATUS_FILE || (
    fs.existsSync('/var/run/hotbando/wg-status-result')
        ? '/var/run/hotbando/wg-status-result'
        : path.join(WG_HOST_DIR, '.wg-status-result')
);

class WireGuardService {
    constructor() {
        this.serverPublicIp = process.env.SERVER_PUBLIC_HOST || process.env.SERVER_PUBLIC_IP || 'hotbandowifi.online';
        this.listenPort = WG_PORT;
        this.networkCidr = WG_NETWORK;
        this.serverIp = WG_SERVER_IP;
        this.interfaceName = WG_INTERFACE;
    }

    // ── Key generation (X25519 via Node.js crypto) ──

    generateKeyPair() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519', {
            publicKeyEncoding: { type: 'spki', format: 'der' },
            privateKeyEncoding: { type: 'pkcs8', format: 'der' }
        });
        return {
            privateKey: privateKey.slice(-32).toString('base64'),
            publicKey: publicKey.slice(-32).toString('base64')
        };
    }

    generatePresharedKey() {
        return crypto.randomBytes(32).toString('base64');
    }

    // ── Server key management (persisted on disk) ──

    ensureServerKeys() {
        try {
            if (!fs.existsSync(WG_KEYS_DIR)) {
                fs.mkdirSync(WG_KEYS_DIR, { recursive: true, mode: 0o700 });
            }

            if (fs.existsSync(SERVER_PUBLIC_KEY_FILE) && fs.existsSync(SERVER_PRIVATE_KEY_FILE)) {
                const pub = fs.readFileSync(SERVER_PUBLIC_KEY_FILE, 'utf8').trim();
                const priv = fs.readFileSync(SERVER_PRIVATE_KEY_FILE, 'utf8').trim();
                return { publicKey: pub, privateKey: priv };
            }

            const keys = this.generateKeyPair();
            fs.writeFileSync(SERVER_PRIVATE_KEY_FILE, keys.privateKey, { mode: 0o600 });
            fs.writeFileSync(SERVER_PUBLIC_KEY_FILE, keys.publicKey, { mode: 0o644 });
            logger.info('WireGuard server keys generated');
            return keys;
        } catch (error) {
            logger.error('Failed to generate server keys:', error.message);
            throw error;
        }
    }

    // ── Next available IP ──

    async getNextAvailableIp() {
        try {
            const [rows] = await db.execute(`
                SELECT wireguard_ip FROM mikrotiks
                WHERE wireguard_ip IS NOT NULL AND wireguard_ip != ''
                ORDER BY wireguard_ip
            `);
            const usedIps = new Set(rows.map(r => r.wireguard_ip));

            // Scan the full /16 (10.7.0.2 .. 10.7.255.254) for scale
            for (let b = 0; b <= 255; b++) {
                for (let i = (b === 0 ? 2 : 1); i <= 254; i++) {
                    const ip = `10.7.${b}.${i}`;
                    if (!usedIps.has(ip)) return ip;
                }
            }
            throw new Error('No available IPs in WireGuard network');
        } catch (error) {
            if (error.message.includes('No available')) throw error;
            return '10.7.0.2';
        }
    }

    // ── Server configuration ──

    async ensureServerConfig() {
        const keys = this.ensureServerKeys();
        const serverKey = keys.privateKey;

        // Get existing peers from DB
        let peers = [];
        try {
            const [rows] = await db.execute(`
                SELECT router_id, router_name, wireguard_ip, wireguard_public_key, wireguard_preshared_key
                FROM mikrotiks
                WHERE wireguard_configured = 1 AND wireguard_ip IS NOT NULL AND wireguard_public_key IS NOT NULL
            `);
            peers = rows;
        } catch (e) {
            // Column may not exist
        }

        let config = `# HotBando WireGuard Server — Auto-generated
# Do NOT edit manually; managed by the system

[Interface]
Address = ${this.serverIp}/${this.networkCidr.split('/')[1]}
ListenPort = ${this.listenPort}
PrivateKey = ${serverKey}

# IP forwarding & NAT
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o ${WG_PUBLIC_IFACE} -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o ${WG_PUBLIC_IFACE} -j MASQUERADE
`;

        for (const peer of peers) {
            config += `
# ${peer.router_name || peer.router_id}
[Peer]
PublicKey = ${peer.wireguard_public_key}
AllowedIPs = ${peer.wireguard_ip}/32
${peer.wireguard_preshared_key ? `PresharedKey = ${peer.wireguard_preshared_key}` : ''}
`;
        }

        fs.writeFileSync(WG_CONF, config, { mode: 0o600 });
        return config;
    }

    // ── Apply server config (writes file + signals host watcher) ──

    async applyServerConfig() {
        await this.ensureServerConfig();

        try {
            // Signal the host-side watcher to apply the config
            const triggerFile = path.join(WG_HOST_DIR, '.wg-apply');
            fs.writeFileSync(triggerFile, Date.now().toString(), { mode: 0o644 });
            logger.info('WireGuard apply triggered (config written to ' + WG_CONF + ')');

            // Wait a few seconds for the watcher to apply
            await new Promise(resolve => setTimeout(resolve, 4000));

            // Check status
            const status = await this.getServerStatus();
            return {
                success: true,
                message: status.running
                    ? 'WireGuard server configured and running'
                    : 'Config written — watcher will apply shortly',
                status
            };
        } catch (error) {
            logger.error('Failed to apply WireGuard config:', error.message);
            return { success: false, message: error.message };
        }
    }

    // ── Add a peer to the server (rebuilds config + triggers watcher) ──

    async addPeerToServer(routerId, routerPublicKey, routerIp) {
        try {
            // Rebuild config file (includes all peers) and trigger watcher
            await this.ensureServerConfig();
            const triggerFile = path.join(WG_HOST_DIR, '.wg-apply');
            fs.writeFileSync(triggerFile, Date.now().toString(), { mode: 0o644 });
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // ── Remove a peer (rebuilds config + triggers watcher) ──

    async removePeerFromServer(routerPublicKey) {
        try {
            await this.ensureServerConfig();
            const triggerFile = path.join(WG_HOST_DIR, '.wg-apply');
            fs.writeFileSync(triggerFile, Date.now().toString(), { mode: 0o644 });
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // ── Get WireGuard status (runs on host via shared volume + status file) ──

    async getServerStatus() {
        const base = {
            running: false,
            interface: this.interfaceName,
            listenPort: this.listenPort,
            serverIp: this.serverIp,
            serverPublicIp: this.serverPublicIp,
            network: this.networkCidr
        };
        // Host watcher status (written by /usr/local/bin/hotbando-wg-apply)
        const statusResult = WG_STATUS_FILE;

        try {
            if (fs.existsSync(statusResult)) {
                const data = JSON.parse(fs.readFileSync(statusResult, 'utf8'));
                return { ...base, ...data };
            }
        } catch (e) { /* fall through */ }

        // Fallback: check if config file exists and parse peers from DB
        let configExists = false;
        try { configExists = fs.existsSync(WG_CONF); } catch (e) {}

        const peers = [];
        try {
            const [rows] = await db.execute(`
                SELECT router_id, router_name, wireguard_ip, wireguard_public_key, status, last_seen
                FROM mikrotiks WHERE wireguard_configured = 1 AND wireguard_ip IS NOT NULL
            `);
            rows.forEach(r => {
                peers.push({
                    routerId: r.router_id, name: r.router_name,
                    wgIp: r.wireguard_ip, publicKey: r.wireguard_public_key,
                    status: r.status, lastSeen: r.last_seen
                });
            });
        } catch (e) { /* columns may not exist */ }

        return {
            running: configExists,
            interface: this.interfaceName,
            listenPort: this.listenPort,
            serverIp: this.serverIp,
            serverPublicIp: this.serverPublicIp,
            network: this.networkCidr,
            peers
        };
    }

    // ── Generate MikroTik WireGuard config commands ──

    generateMikroTikConfig(options) {
        const { routerName, assignedIp, privateKey, publicKey, serverPublicKey, serverEndpoint } = options;

        return `
# WireGuard Configuration — ${routerName}
# Generated: ${new Date().toISOString()}

# 1. Create WireGuard interface
/interface wireguard add name=wg-hotbando listen-port=13231 private-key="${privateKey}"

# 2. Add server as peer
/interface wireguard peers add \\
    interface=wg-hotbando \\
    public-key="${serverPublicKey}" \\
    endpoint-address=${serverEndpoint} \\
    endpoint-port=${this.listenPort} \\
    allowed-address=${this.serverIp}/32 \\
    persistent-keepalive=25s

# 3. Assign IP
/ip address add address=${assignedIp}/32 interface=wg-hotbando

# 4. Route to server network
/ip route add dst-address=${this.serverIp}/32 gateway=wg-hotbando

# 5. Firewall: allow WG traffic
/ip firewall filter add chain=input protocol=udp dst-port=13231 action=accept comment="WireGuard Input"
/ip firewall filter add chain=forward in-interface=wg-hotbando action=accept comment="WireGuard Fwd In"
/ip firewall filter add chain=forward out-interface=wg-hotbando action=accept comment="WireGuard Fwd Out"

# 6. Restrict API access to WG network
/ip service set api address=${this.networkCidr}
`;
    }

    // ── Database persistence ──

    async saveRouterWireGuard(routerId, assignedIp, publicKey, privateKey, presharedKey) {
        try {
            await db.execute(`
                UPDATE mikrotiks SET
                    wireguard_ip = ?,
                    wireguard_public_key = ?,
                    wireguard_private_key = ?,
                    wireguard_preshared_key = ?,
                    wireguard_configured = 1,
                    updated_at = NOW()
                WHERE router_id = ?
            `, [assignedIp, publicKey, privateKey, presharedKey, routerId]);
        } catch (e) {
            logger.warn('Could not save WireGuard info to DB (columns may not exist): ' + e.message);
        }
    }

    async getWireGuardPeers() {
        try {
            let runtimeStatus = null;
            try {
                const statusFile = WG_STATUS_FILE;
                if (fs.existsSync(statusFile)) runtimeStatus = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
            } catch (e) { /* use database status if host status is unavailable */ }

            const [peers] = await db.execute(`
                SELECT router_id, router_name, wireguard_ip, wireguard_public_key, status, last_seen,
                       wireguard_configured, setup_status
                FROM mikrotiks
                WHERE wireguard_configured = 1 OR wireguard_ip IS NOT NULL
                ORDER BY wireguard_ip
            `);
            const configuredPeers = peers.filter(p => Number(p.wireguard_configured) === 1 && p.setup_status === 'configured');
            const singleActiveConfiguredRouter = runtimeStatus?.running && Number(runtimeStatus.activePeers) === 1 && configuredPeers.length === 1
                ? configuredPeers[0].router_id
                : null;
            return {
                success: true,
                peers: peers.map(p => {
                    const handshake = Number(runtimeStatus?.peerHandshakes?.[p.wireguard_public_key]) || 0;
                    const handshakeIsFresh = handshake > 0 && (Date.now() / 1000 - handshake) <= 180;
                    const hasHandshakeData = !!runtimeStatus?.peerHandshakes;
                    const activeBySinglePeerCount = p.router_id === singleActiveConfiguredRouter;
                    const peerIsOnline = hasHandshakeData
                        ? runtimeStatus.running && handshakeIsFresh
                        : activeBySinglePeerCount;
                    const observedAt = Number(runtimeStatus?.updatedAt) || 0;
                    return {
                        routerId: p.router_id,
                        name: p.router_name,
                        wgIp: p.wireguard_ip,
                        publicKey: p.wireguard_public_key,
                        status: peerIsOnline ? 'online' : (hasHandshakeData ? 'offline' : p.status),
                        lastSeen: handshake > 0
                            ? new Date(handshake * 1000).toISOString()
                            : (activeBySinglePeerCount && observedAt ? new Date(observedAt * 1000).toISOString() : p.last_seen)
                    };
                })
            };
        } catch (error) {
            return { success: true, peers: [] };
        }
    }

    // ── Legacy helpers (kept for backward compat) ──

    generateServerConfig(peers = []) {
        let config = `# HotBando WireGuard Server\n[Interface]\nAddress = ${this.serverIp}/24\nListenPort = ${this.listenPort}\nPrivateKey = <SERVER_PRIVATE_KEY>\n`;
        peers.forEach(peer => {
            config += `\n[Peer]\nPublicKey = ${peer.publicKey}\nAllowedIPs = ${peer.allowedIp}/32\n`;
        });
        return config;
    }

    getVpsSetupGuide() {
        return `# This server IS the WireGuard hub. No external VPS needed.
# WireGuard is managed automatically by the system.
# Server public host: ${this.serverPublicIp}
# WireGuard port: ${this.listenPort}
# Network: ${this.networkCidr}`;
    }
}

module.exports = new WireGuardService();
