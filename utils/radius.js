const dgram = require('dgram');
const crypto = require('crypto');
const db = require('../config/database');

const RADIUS_PORT_AUTH = 1812;
const RADIUS_PORT_ACCT = 1813;
const RADIUS_TIMEOUT = 5000;

class RadiusClient {
    constructor(config = {}) {
        this.enabled = config.enabled || false;
        this.host = config.host || '127.0.0.1';
        this.secret = config.secret || process.env.RADIUS_SECRET;
        this.authPort = config.authPort || RADIUS_PORT_AUTH;
        this.acctPort = config.acctPort || RADIUS_PORT_ACCT;
        this.nasIdentifier = config.nasIdentifier || 'hotbando-server';
        this.nasIpAddress = config.nasIpAddress || '127.0.0.1';
    }

    createPacket(code, identifier, attributes) {
        const length = 20 + attributes.reduce((sum, attr) => sum + 2 + attr.value.length, 0);
        const packet = Buffer.alloc(length);

        packet.writeUInt8(code, 0);
        packet.writeUInt8(identifier, 1);
        packet.writeUInt16BE(length, 2);

        let offset = 20;
        for (const attr of attributes) {
            packet.writeUInt8(attr.type, offset);
            packet.writeUInt8(2 + attr.value.length, offset + 1);
            attr.value.copy(packet, offset + 2);
            offset += 2 + attr.value.length;
        }

        const authenticator = this.createAuthenticator(packet, this.secret);
        authenticator.copy(packet, 4);
        return packet;
    }

    createAuthenticator(packet, secret) {
        const hash = crypto.createHash('md5');
        hash.update(packet.slice(0, 4));
        hash.writeUInt32BE(0, 0);
        hash.update(packet.slice(8));
        hash.update(Buffer.from(secret, 'utf-8'));
        return hash.digest();
    }

    encodeAttribute(type, value) {
        const buf = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'utf-8');
        return { type, value: buf };
    }

    encodeString(str) {
        return Buffer.from(str, 'utf-8');
    }

    encodeIP(ip) {
        return Buffer.from(ip.split('.').map(Number));
    }

    encodeInt(val) {
        const buf = Buffer.alloc(4);
        buf.writeUInt32BE(val);
        return buf;
    }

    async sendAccounting(startTime, { username, mac, routerId, ip, sessionId, bytesIn, bytesOut, acctType }) {
        if (!this.enabled) return null;

        return new Promise((resolve) => {
            try {
                const identifier = crypto.randomBytes(1)[0];
                const now = new Date();
                const sessionTime = Math.floor((now - startTime) / 1000);

                const attrs = [
                    this.encodeAttribute(1, this.encodeString(username)),
                    this.encodeAttribute(4, this.encodeIP(this.nasIpAddress)),
                    this.encodeAttribute(5, this.encodeInt(routerId || 0)),
                    this.encodeAttribute(8, this.encodeString(sessionId || `hotbando-${username}-${now.getTime()}`)),
                    this.encodeAttribute(30, this.encodeString(mac)),
                    this.encodeAttribute(31, this.encodeString('HotBando-WiFi')),
                    this.encodeAttribute(40, this.encodeString(acctType || 'Start')),
                    this.encodeAttribute(44, this.encodeInt(sessionTime)),
                    this.encodeAttribute(46, this.encodeInt(bytesIn || 0)),
                    this.encodeAttribute(47, this.encodeInt(bytesOut || 0)),
                    this.encodeAttribute(61, this.encodeInt(1)),
                ];

                const code = acctType === 'Stop' ? 4 : (acctType === 'Interim' ? 4 : 4);
                const packet = this.createPacket(code, identifier, attrs);

                const socket = dgram.createSocket('udp4');
                const timer = setTimeout(() => {
                    socket.close();
                    resolve({ success: false, error: 'timeout' });
                }, RADIUS_TIMEOUT);

                socket.send(packet, this.acctPort, this.host, (err) => {
                    if (err) {
                        clearTimeout(timer);
                        socket.close();
                        resolve({ success: false, error: err.message });
                    }
                });

                socket.on('message', () => {
                    clearTimeout(timer);
                    socket.close();
                    resolve({ success: true });
                });

            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    async logAccounting({ userId, mac, routerId, locationId, action, sessionDuration, bytesUp, bytesDown }) {
        try {
            await db.execute(
                `INSERT INTO user_connection_logs 
                 (user_id, mac_address, router_id, location_id, action, session_duration, bytes_uploaded, bytes_downloaded, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, mac, routerId, locationId, action, sessionDuration || 0, bytesUp || 0, bytesDown || 0, this.nasIpAddress]
            );

            await this.sendAccounting(new Date(), {
                username: `user_${userId}`,
                mac,
                routerId,
                ip: this.nasIpAddress,
                sessionId: `hb-${userId}-${Date.now()}`,
                bytesIn: bytesDown || 0,
                bytesOut: bytesUp || 0,
                acctType: action === 'connect' ? 'Start' : (action === 'disconnect' ? 'Stop' : 'Interim'),
            });

            return { success: true };
        } catch (error) {
            console.error('RADIUS accounting error:', error.message);
            return { success: false, error: error.message };
        }
    }
}

const radiusClient = new RadiusClient({
    enabled: process.env.RADIUS_ENABLED === 'true',
    host: process.env.RADIUS_HOST || '127.0.0.1',
    secret: process.env.RADIUS_SECRET,
    nasIdentifier: process.env.NAS_IDENTIFIER || 'hotbando-server',
    nasIpAddress: process.env.NAS_IP_ADDRESS || '127.0.0.1',
});

module.exports = radiusClient;
