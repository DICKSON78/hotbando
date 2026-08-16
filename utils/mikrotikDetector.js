// utils/mikrotikDetector.js
// Auto-detection system for MikroTik routers on local network
// Scans for MikroTik devices using ARP, DHCP, and network discovery

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const db = require('../config/database');

class MikrotikDetector {
    constructor() {
        this.detectedRouters = new Map();
        this.scanInterval = null;
        this.isScanning = false;
    }

    /**
     * Scan local network for MikroTik devices
     * Uses ARP table, DHCP leases, and port scanning
     */
    async scanForMikroTik(networkRange = null) {
        if (this.isScanning) {
            console.log('🔍 Scan already in progress...');
            return [];
        }

        this.isScanning = true;
        const detected = [];

        try {
            console.log('🔍 Scanning for MikroTik devices...');

            // Method 1: Check ARP table for MikroTik OUI
            const arpDevices = await this.scanArpTable();
            detected.push(...arpDevices);

            // Method 2: Check DHCP leases
            const dhcpDevices = await this.scanDhcpLeases();
            detected.push(...dhcpDevices);

            // Method 3: Scan common MikroTik ports on network
            if (networkRange) {
                const portDevices = await this.scanPorts(networkRange);
                detected.push(...portDevices);
            }

            // Method 4: Check for MikroTik via mDNS/Bonjour
            const mdnsDevices = await this.scanMdns();
            detected.push(...mdnsDevices);

            // Deduplicate by IP
            const uniqueDevices = this.deduplicateDevices(detected);

            // Enrich with MikroTik-specific info
            const enrichedDevices = await this.enrichDeviceInfo(uniqueDevices);

            // Store detected devices
            this.detectedRouters.clear();
            for (const device of enrichedDevices) {
                this.detectedRouters.set(device.ip, device);
            }

            console.log(`✅ Found ${enrichedDevices.length} MikroTik device(s)`);
            return enrichedDevices;

        } catch (error) {
            console.error('❌ Scan error:', error.message);
            return [];
        } finally {
            this.isScanning = false;
        }
    }

    /**
     * Scan ARP table for MikroTik MAC addresses
     * MikroTik OUI prefixes: 4C:5E:0C, 6C:3B:6B, 74:4D:28, etc.
     */
    async scanArpTable() {
        const devices = [];
        const mikrotikOuis = [
            '4c:5e:0c', '6c:3b:6b', '74:4d:28', 'b8:69:f4', 
            'cc:2d:21', 'd4:01:c3', 'e4:8d:8c', 'e8:bd:d1',
            '2c:c8:1b', '18:fd:74', '48:a9:8a', '64:d1:54'
        ];

        try {
            // Linux ARP table
            const { stdout } = await execPromise('arp -a 2>/dev/null || ip neigh show 2>/dev/null');
            const lines = stdout.split('\n').filter(l => l.trim());

            for (const line of lines) {
                // Parse ARP entry: IP (if) MAC type
                const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+\S+\s+([0-9a-fA-F:]{17})/);
                if (match) {
                    const [, ip, mac] = match;
                    const macLower = mac.toLowerCase();
                    
                    // Check if MAC matches MikroTik OUI
                    const isMikrotik = mikrotikOuis.some(oui => macLower.startsWith(oui));
                    
                    if (isMikrotik) {
                        devices.push({
                            ip,
                            mac,
                            source: 'arp',
                            isMikrotik: true,
                            confidence: 'high'
                        });
                    }
                }
            }
        } catch (error) {
            // ARP scan failed, continue with other methods
        }

        return devices;
    }

    /**
     * Scan DHCP leases for MikroTik devices
     */
    async scanDhcpLeases() {
        const devices = [];

        try {
            // Check MikroTik-style DHCP leases (if running on MikroTik)
            const { stdout } = await execPromise(
                'cat /var/lib/dhcp/dhclient.leases 2>/dev/null | grep -E "lease|fixed-address|hardware" || true'
            );
            
            // Parse DHCP leases
            const lines = stdout.split('\n');
            let currentLease = {};
            
            for (const line of lines) {
                if (line.includes('lease {')) {
                    currentLease = {};
                } else if (line.includes('fixed-address')) {
                    const match = line.match(/fixed-address\s+([\d.]+)/);
                    if (match) currentLease.ip = match[1];
                } else if (line.includes('hardware ethernet')) {
                    const match = line.match(/hardware ethernet\s+([0-9a-fA-F:]+)/);
                    if (match) currentLease.mac = match[1];
                } else if (line.includes('}')) {
                    if (currentLease.ip && currentLease.mac) {
                        devices.push({
                            ...currentLease,
                            source: 'dhcp',
                            isMikrotik: false, // Will be verified later
                            confidence: 'medium'
                        });
                    }
                    currentLease = {};
                }
            }
        } catch (error) {
            // DHCP scan failed
        }

        return devices;
    }

    /**
     * Scan network range for MikroTik API port (8728)
     */
    async scanPorts(networkRange, port = 8728) {
        const devices = [];

        try {
            // Use nmap if available, otherwise fall back to ping sweep
            try {
                const { stdout } = await execPromise(
                    `nmap -p ${port} --open -T4 ${networkRange} 2>/dev/null | grep -B1 "open" | grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" || true`
                );
                
                const ips = stdout.split('\n').filter(ip => ip.trim());
                for (const ip of ips) {
                    devices.push({
                        ip: ip.trim(),
                        port,
                        source: 'port-scan',
                        isMikrotik: false, // Will be verified
                        confidence: 'high'
                    });
                }
            } catch (e) {
                // nmap not available, try ping sweep
                const { stdout } = await execPromise(
                    `for i in $(seq 1 254); do ping -c1 -W1 ${networkRange}.$i 2>/dev/null | grep "bytes from" | cut -d: -f1 | cut -d' ' -f4 & done; wait`
                );
                
                const ips = stdout.split('\n').filter(ip => ip.trim());
                for (const ip of ips) {
                    devices.push({
                        ip: ip.trim(),
                        source: 'ping-sweep',
                        isMikrotik: false,
                        confidence: 'low'
                    });
                }
            }
        } catch (error) {
            // Port scan failed
        }

        return devices;
    }

    /**
     * Scan for MikroTik via mDNS/Bonjour
     */
    async scanMdns() {
        const devices = [];

        try {
            // Check for MikroTik mDNS
            const { stdout } = await execPromise(
                'avahi-browse -a -t 2>/dev/null | grep -i mikrotik || true'
            );

            if (stdout.trim()) {
                const lines = stdout.split('\n');
                for (const line of lines) {
                    const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)/);
                    if (ipMatch) {
                        devices.push({
                            ip: ipMatch[1],
                            source: 'mdns',
                            isMikrotik: true,
                            confidence: 'high'
                        });
                    }
                }
            }
        } catch (error) {
            // mDNS scan failed
        }

        return devices;
    }

    /**
     * Verify if a device is actually a MikroTik router
     * Tries to connect via API and get identity
     */
    async verifyMikrotik(ip, port = 8728, user = 'admin', password = '') {
        try {
            const RouterOSAPI = require('node-routeros').RouterOSAPI;
            
            const conn = new RouterOSAPI({
                host: ip,
                user: user,
                password: password,
                port: port,
                timeout: 3000
            });

            await Promise.race([
                conn.connect(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Connection timeout')), 4000)
                )
            ]);
            const [identity] = await conn.write('/system/identity/print');
            const [resource] = await conn.write('/system/resource/print');
            conn.close();

            return {
                isMikrotik: true,
                identity: identity.name,
                model: resource['board-name'],
                firmware: resource.version,
                uptime: resource.uptime
            };
        } catch (error) {
            return { isMikrotik: false };
        }
    }

    /**
     * Enrich device info with MikroTik details
     */
    async enrichDeviceInfo(devices) {
        const enriched = [];

        for (const device of devices) {
            // If not sure it's MikroTik, try to verify
            if (!device.isMikrotik || device.confidence !== 'high') {
                const verification = await this.verifyMikrotik(device.ip);
                if (verification.isMikrotik) {
                    device.isMikrotik = true;
                    device.identity = verification.identity;
                    device.model = verification.model;
                    device.firmware = verification.firmware;
                    device.uptime = verification.uptime;
                } else {
                    continue; // Skip non-MikroTik devices
                }
            }

            // Check if already in database
            const [existing] = await db.execute(
                'SELECT router_id, router_name, setup_status FROM mikrotiks WHERE host = ?',
                [device.ip]
            );

            device.inDatabase = existing.length > 0;
            device.existingRouter = existing[0] || null;

            enriched.push(device);
        }

        return enriched;
    }

    /**
     * Deduplicate devices by IP address
     */
    deduplicateDevices(devices) {
        const seen = new Map();
        
        for (const device of devices) {
            if (!seen.has(device.ip)) {
                seen.set(device.ip, device);
            } else {
                // Merge info from duplicate
                const existing = seen.get(device.ip);
                if (device.confidence === 'high' && existing.confidence !== 'high') {
                    seen.set(device.ip, device);
                }
            }
        }

        return Array.from(seen.values());
    }

    /**
     * Get all detected routers
     */
    getDetected() {
        return Array.from(this.detectedRouters.values());
    }

    /**
     * Get router by IP
     */
    getByIp(ip) {
        return this.detectedRouters.get(ip) || null;
    }

    /**
     * Start periodic scanning
     */
    startAutoScan(intervalMs = 30000) {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
        }

        // Initial scan
        this.scanForMikroTik();

        // Periodic scan
        this.scanInterval = setInterval(() => {
            this.scanForMikroTik();
        }, intervalMs);

        console.log(`✅ Auto-scan started (interval: ${intervalMs}ms)`);
    }

    /**
     * Stop auto scanning
     */
    stopAutoScan() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
            console.log('⏹️ Auto-scan stopped');
        }
    }

    /**
     * Get network interface info for scanning
     */
    async getNetworkInfo() {
        try {
            const { stdout } = await execPromise('ip -4 addr show | grep -E "inet " | grep -v "127.0.0.1"');
            const interfaces = [];
            
            const lines = stdout.split('\n').filter(l => l.trim());
            for (const line of lines) {
                const match = line.match(/inet\s+([\d.]+)\/(\d+)\s+.*\s+(\S+)/);
                if (match) {
                    const [, ip, cidr, iface] = match;
                    // Calculate network range
                    const parts = ip.split('.');
                    const network = parts.slice(0, 3).join('.') + '.0';
                    interfaces.push({
                        interface: iface,
                        ip,
                        cidr: parseInt(cidr),
                        network,
                        range: `${parts[0]}.${parts[1]}.${parts[2]}.1-254`
                    });
                }
            }

            return interfaces;
        } catch (error) {
            return [];
        }
    }
}

module.exports = new MikrotikDetector();
