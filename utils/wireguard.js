/**
 * WireGuard Service for HotBando
 * Handles key generation, config generation, and peer management
 */

const crypto = require('crypto');
const db = require('../config/database');

class WireGuardService {
  constructor() {
    // VPS Server Configuration
    this.vpsConfig = {
      publicIp: process.env.WG_VPS_IP || '196.192.xxx.xxx',
      listenPort: parseInt(process.env.WG_PORT) || 51820,
      networkCidr: '10.7.0.0/24',
      serverIp: '10.7.0.1',
      interfaceName: 'wg0'
    };
  }

  /**
   * Generate WireGuard keypair using Node.js crypto
   * Returns { privateKey, publicKey }
   */
  generateKeyPair() {
    // Generate X25519 keypair (Curve25519)
    const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519', {
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' }
    });

    // Extract raw keys (last 32 bytes of DER encoding)
    const rawPrivate = privateKey.slice(-32);
    const rawPublic = publicKey.slice(-32);

    return {
      privateKey: rawPrivate.toString('base64'),
      publicKey: rawPublic.toString('base64')
    };
  }

  /**
   * Generate preshared key for additional security
   */
  generatePresharedKey() {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Get next available IP in the WireGuard network
   */
  async getNextAvailableIp() {
    try {
      // Get all assigned IPs
      const [rows] = await db.execute(`
        SELECT wireguard_ip FROM mikrotiks
        WHERE wireguard_ip IS NOT NULL
        ORDER BY wireguard_ip
      `);

      const usedIps = rows.map(r => r.wireguard_ip);

      // Find next available IP (starting from 10.7.0.2, as .1 is server)
      for (let i = 2; i <= 254; i++) {
        const ip = `10.7.0.${i}`;
        if (!usedIps.includes(ip)) {
          return ip;
        }
      }

      throw new Error('No available IP addresses in WireGuard network');
    } catch (error) {
      console.error('Error getting next IP:', error);
      // Default to .2 if table doesn't have wireguard_ip column
      return '10.7.0.2';
    }
  }

  /**
   * Generate VPS server configuration
   */
  generateServerConfig(peers = []) {
    let config = `# WireGuard Server Configuration - HotBando VPS
# Auto-generated: ${new Date().toISOString()}

[Interface]
Address = ${this.vpsConfig.serverIp}/24
ListenPort = ${this.vpsConfig.listenPort}
PrivateKey = <SERVER_PRIVATE_KEY>

# Enable IP forwarding
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

`;

    // Add peers
    peers.forEach(peer => {
      config += `
# ${peer.name || peer.routerId}
[Peer]
PublicKey = ${peer.publicKey}
AllowedIPs = ${peer.allowedIp}/32
${peer.presharedKey ? `PresharedKey = ${peer.presharedKey}` : ''}
`;
    });

    return config;
  }

  /**
   * Generate MikroTik router configuration commands
   */
  generateMikroTikConfig(options) {
    const {
      routerName,
      routerId,
      assignedIp,
      privateKey,
      publicKey,
      serverPublicKey,
      serverEndpoint
    } = options;

    const commands = `
###############################################
# WireGuard Configuration for MikroTik Router
# Router: ${routerName} (${routerId})
# Assigned IP: ${assignedIp}
# Generated: ${new Date().toISOString()}
###############################################

# Step 1: Create WireGuard interface
/interface wireguard add name=wg-hotbando listen-port=${this.vpsConfig.listenPort} private-key="${privateKey}"

# Step 2: Add peer (VPS Server)
/interface wireguard peers add \\
    interface=wg-hotbando \\
    public-key="${serverPublicKey}" \\
    endpoint-address=${serverEndpoint || this.vpsConfig.publicIp} \\
    endpoint-port=${this.vpsConfig.listenPort} \\
    allowed-address=${this.vpsConfig.networkCidr} \\
    persistent-keepalive=25s

# Step 3: Assign IP address to WireGuard interface
/ip address add address=${assignedIp}/24 interface=wg-hotbando network=10.7.0.0

# Step 4: Add route to WireGuard network (if not auto-added)
/ip route add dst-address=${this.vpsConfig.networkCidr} gateway=wg-hotbando

# Step 5: Configure firewall to allow WireGuard traffic
/ip firewall filter add chain=input protocol=udp dst-port=${this.vpsConfig.listenPort} action=accept comment="WireGuard"
/ip firewall filter add chain=forward in-interface=wg-hotbando action=accept comment="WireGuard Forward In"
/ip firewall filter add chain=forward out-interface=wg-hotbando action=accept comment="WireGuard Forward Out"

# Step 6: NAT for WireGuard traffic (optional - for internet access via VPS)
# /ip firewall nat add chain=srcnat out-interface=wg-hotbando action=masquerade

# Step 7: Enable API access via WireGuard (secure remote management)
/ip service set api address=10.7.0.0/24
/ip service set api-ssl address=10.7.0.0/24

# Step 8: Verify connection
# After running these commands, verify with:
# /interface wireguard print
# /interface wireguard peers print
# /ping ${this.vpsConfig.serverIp}

###############################################
# Router Public Key (add this to VPS server):
# ${publicKey}
###############################################
`;

    return commands;
  }

  /**
   * Generate configuration for a router and save to database
   */
  async generateRouterConfig(routerId) {
    try {
      // Get router info
      const [routers] = await db.execute(
        'SELECT * FROM mikrotiks WHERE router_id = ?',
        [routerId]
      );

      if (routers.length === 0) {
        throw new Error('Router not found');
      }

      const router = routers[0];

      // Generate keys
      const keys = this.generateKeyPair();
      const presharedKey = this.generatePresharedKey();

      // Get next available IP
      const assignedIp = await this.getNextAvailableIp();

      // Get server public key from settings (or use placeholder)
      const [settings] = await db.execute(
        "SELECT setting_value FROM system_settings WHERE setting_key = 'wireguard_server_public_key'"
      );
      const serverPublicKey = settings[0]?.setting_value || '<VPS_SERVER_PUBLIC_KEY>';

      // Generate MikroTik commands
      const mikrotikCommands = this.generateMikroTikConfig({
        routerName: router.router_name,
        routerId: router.router_id,
        assignedIp,
        privateKey: keys.privateKey,
        publicKey: keys.publicKey,
        serverPublicKey,
        serverEndpoint: this.vpsConfig.publicIp
      });

      // Save WireGuard config to router (try, but don't fail if columns don't exist)
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
        `, [assignedIp, keys.publicKey, keys.privateKey, presharedKey, routerId]);
      } catch (dbError) {
        console.log('WireGuard columns may not exist, skipping DB update');
      }

      return {
        success: true,
        router: {
          id: router.id,
          routerId: router.router_id,
          name: router.router_name
        },
        wireguard: {
          assignedIp,
          publicKey: keys.publicKey,
          privateKey: keys.privateKey,
          presharedKey
        },
        mikrotikCommands,
        serverInfo: {
          publicIp: this.vpsConfig.publicIp,
          port: this.vpsConfig.listenPort,
          network: this.vpsConfig.networkCidr
        }
      };
    } catch (error) {
      console.error('Error generating router config:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all WireGuard peers (routers with WireGuard configured)
   */
  async getWireGuardPeers() {
    try {
      const [peers] = await db.execute(`
        SELECT
          router_id,
          router_name,
          wireguard_ip,
          wireguard_public_key,
          status,
          last_seen
        FROM mikrotiks
        WHERE wireguard_configured = 1 OR wireguard_ip IS NOT NULL
        ORDER BY wireguard_ip
      `);

      return {
        success: true,
        peers: peers.map(p => ({
          routerId: p.router_id,
          name: p.router_name,
          wgIp: p.wireguard_ip,
          publicKey: p.wireguard_public_key,
          status: p.status,
          lastSeen: p.last_seen
        }))
      };
    } catch (error) {
      // If columns don't exist, return empty
      return { success: true, peers: [] };
    }
  }

  /**
   * Generate peer addition command for VPS server
   */
  generateAddPeerCommand(publicKey, allowedIp, routerName) {
    return `# Add peer: ${routerName}
wg set wg0 peer ${publicKey} allowed-ips ${allowedIp}/32

# Or add to /etc/wireguard/wg0.conf:
# [Peer]
# # ${routerName}
# PublicKey = ${publicKey}
# AllowedIPs = ${allowedIp}/32`;
  }

  /**
   * VPS Setup guide
   */
  getVpsSetupGuide() {
    return `
###############################################
# WireGuard VPS Server Setup Guide
# HotBando Central Server
###############################################

# 1. Install WireGuard
apt update && apt install -y wireguard

# 2. Generate server keys
wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
chmod 600 /etc/wireguard/server_private.key

# 3. Create configuration file
cat > /etc/wireguard/wg0.conf << 'EOF'
[Interface]
Address = ${this.vpsConfig.serverIp}/24
ListenPort = ${this.vpsConfig.listenPort}
PrivateKey = $(cat /etc/wireguard/server_private.key)

PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Peers will be added below as routers are configured
EOF

# 4. Enable IP forwarding
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
sysctl -p

# 5. Configure firewall
ufw allow ${this.vpsConfig.listenPort}/udp

# 6. Start WireGuard
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

# 7. Verify
wg show

# 8. Get server public key (save this for MikroTik routers)
cat /etc/wireguard/server_public.key
`;
  }
}

module.exports = new WireGuardService();
