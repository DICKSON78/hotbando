const https = require('https');
const http = require('http');
const db = require('../config/database');
const { decrypt, isEncrypted } = require('./encryption');

class RouterOSRestClient {
    constructor() {
        this.connections = new Map();
        this.defaultRestPort = parseInt(process.env.ROUTER_REST_PORT) || 443;
        this.useSsl = process.env.ROUTER_REST_SSL !== 'false';
        this.timeout = parseInt(process.env.MIKROTIK_TIMEOUT) || 10;
    }

    /**
     * Get router connection info from database
     */
    async getRouterInfo(routerID) {
        let conn = this.connections.get(routerID);
        if (!conn) {
            const isNumericId = /^\d+$/.test(String(routerID));
            const [routers] = await db.execute(
                isNumericId
                    ? 'SELECT id, router_id, router_name, host, port, `user`, `password`, status FROM mikrotiks WHERE id = ?'
                    : 'SELECT id, router_id, router_name, host, port, `user`, `password`, status FROM mikrotiks WHERE router_id = ?',
                [isNumericId ? parseInt(routerID) : routerID]
            );
            if (routers.length === 0) throw new Error(`Router ${routerID} not found`);
            conn = routers[0];
            this.connections.set(routerID, conn);
        }
        return conn;
    }

    /**
     * Execute REST API command (GET)
     */
    async execute(routerID, command, params = {}) {
        const conn = await this.getRouterInfo(routerID);
        const host = conn.host;
        const port = this.defaultRestPort;
        const user = conn.user;
        // Decrypt password if encrypted
        const password = isEncrypted(conn.password) ? decrypt(conn.password) : conn.password;

        const urlPath = `/rest${command}`;
        const queryString = Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        const fullPath = queryString ? `${urlPath}?${queryString}` : urlPath;

        const auth = Buffer.from(`${user}:${password}`).toString('base64');

        return new Promise((resolve, reject) => {
            const lib = this.useSsl ? https : http;
            const req = lib.request({
                hostname: host,
                port: port,
                path: fullPath,
                method: 'GET',
                timeout: this.timeout * 1000,
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
                rejectUnauthorized: process.env.NODE_ENV === 'production',
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode >= 400) {
                            reject(new Error(`REST API error ${res.statusCode}`));
                        } else {
                            resolve(parsed);
                        }
                    } catch {
                        resolve(data);
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
            req.end();
        });
    }

    async post(routerID, command, body = {}) {
        const conn = await this.getRouterInfo(routerID);
        const host = conn.host;
        const port = this.defaultRestPort;
        const user = conn.user;
        const password = conn.password;
        const auth = Buffer.from(`${user}:${password}`).toString('base64');
        const bodyStr = JSON.stringify(body);

        return new Promise((resolve, reject) => {
            const lib = this.useSsl ? https : http;
            const req = lib.request({
                hostname: host,
                port: port,
                path: `/rest${command}`,
                method: 'POST',
                timeout: this.timeout * 1000,
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(bodyStr),
                },
                rejectUnauthorized: process.env.NODE_ENV === 'production',
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode >= 400) {
                            reject(new Error(`REST API error ${res.statusCode}: ${JSON.stringify(parsed)}`));
                        } else {
                            resolve(parsed);
                        }
                    } catch {
                        resolve(data);
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
            req.write(bodyStr);
            req.end();
        });
    }

    async patch(routerID, command, body = {}) {
        const conn = await this.getRouterInfo(routerID);
        const host = conn.host;
        const port = this.defaultRestPort;
        const user = conn.user;
        const password = conn.password;
        const auth = Buffer.from(`${user}:${password}`).toString('base64');
        const bodyStr = JSON.stringify(body);

        return new Promise((resolve, reject) => {
            const lib = this.useSsl ? https : http;
            const req = lib.request({
                hostname: host,
                port: port,
                path: `/rest${command}`,
                method: 'PATCH',
                timeout: this.timeout * 1000,
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(bodyStr),
                },
                rejectUnauthorized: process.env.NODE_ENV === 'production',
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode >= 400) {
                            reject(new Error(`REST API error ${res.statusCode}`));
                        } else {
                            resolve(parsed);
                        }
                    } catch {
                        resolve(data);
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
            req.write(bodyStr);
            req.end();
        });
    }

    async put(routerID, command, body = {}) {
        const conn = await this.getRouterInfo(routerID);
        const host = conn.host;
        const port = this.defaultRestPort;
        const user = conn.user;
        const password = conn.password;
        const auth = Buffer.from(`${user}:${password}`).toString('base64');
        const bodyStr = JSON.stringify(body);

        return new Promise((resolve, reject) => {
            const lib = this.useSsl ? https : http;
            const req = lib.request({
                hostname: host,
                port: port,
                path: `/rest${command}`,
                method: 'PUT',
                timeout: this.timeout * 1000,
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(bodyStr),
                },
                rejectUnauthorized: process.env.NODE_ENV === 'production',
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode >= 400) {
                            reject(new Error(`REST API error ${res.statusCode}`));
                        } else {
                            resolve(parsed);
                        }
                    } catch {
                        resolve(data);
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
            req.write(bodyStr);
            req.end();
        });
    }

    async delete(routerID, command) {
        const conn = await this.getRouterInfo(routerID);
        const host = conn.host;
        const port = this.defaultRestPort;
        const user = conn.user;
        const password = conn.password;
        const auth = Buffer.from(`${user}:${password}`).toString('base64');

        return new Promise((resolve, reject) => {
            const lib = this.useSsl ? https : http;
            const req = lib.request({
                hostname: host,
                port: port,
                path: `/rest${command}`,
                method: 'DELETE',
                timeout: this.timeout * 1000,
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
                rejectUnauthorized: process.env.NODE_ENV === 'production',
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode >= 400) {
                            reject(new Error(`REST API error ${res.statusCode}`));
                        } else {
                            resolve(parsed);
                        }
                    } catch {
                        resolve(data);
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
            req.end();
        });
    }

    async getIdentity(routerID) {
        return this.execute(routerID, '/system/identity/print');
    }

    async getResource(routerID) {
        return this.execute(routerID, '/system/resource/print');
    }

    async getInterfaces(routerID) {
        return this.execute(routerID, '/interface/print');
    }

    async getWirelessInterfaces(routerID) {
        return this.execute(routerID, '/interface/wireless/print');
    }

    async getHotspotActive(routerID) {
        return this.execute(routerID, '/ip/hotspot/active/print');
    }

    async getHotspotUsers(routerID) {
        return this.execute(routerID, '/ip/hotspot/user/print');
    }

    async getHotspotBindings(routerID) {
        return this.execute(routerID, '/ip/hotspot/ip-binding/print');
    }

    async getHotspotServer(routerID) {
        return this.execute(routerID, '/ip/hotspot/print');
    }

    async reboot(routerID) {
        return this.post(routerID, '/system/reboot');
    }

    async shutdown(routerID) {
        return this.post(routerID, '/system/shutdown');
    }

    async addHotspotUser(routerID, { name, password, profile = 'default', comment = '' }) {
        return this.put(routerID, '/ip/hotspot/user/add', {
            name, password, profile, comment,
        });
    }

    async removeHotspotUser(routerID, username) {
        const users = await this.getHotspotUsers(routerID);
        const user = users.find(u => u.name === username);
        if (user && user['.id']) {
            return this.post(routerID, '/ip/hotspot/user/remove', { '.id': user['.id'] });
        }
        throw new Error(`User ${username} not found`);
    }

    async kickSession(routerID, sessionId) {
        return this.post(routerID, '/ip/hotspot/active/remove', { '.id': sessionId });
    }

    async addIpBinding(routerID, { mac, ip, type = 'bypassed', comment = '' }) {
        return this.put(routerID, '/ip/hotspot/ip-binding/add', {
            'mac-address': mac,
            address: ip,
            type,
            comment,
        });
    }

    async removeIpBinding(routerID, bindingId) {
        return this.post(routerID, '/ip/hotspot/ip-binding/remove', { '.id': bindingId });
    }

    async setIdentity(routerID, name) {
        return this.patch(routerID, '/system/identity/set', { name });
    }

    async toggleHotspotServer(routerID, serverName, enable = true) {
        const servers = await this.getHotspotServer(routerID);
        const server = servers.find(s => s.name === serverName);
        if (server && server['.id']) {
            const action = enable ? 'enable' : 'disable';
            return this.post(routerID, `/ip/hotspot/${action}`, { '.id': server['.id'] });
        }
        throw new Error(`Server ${serverName} not found`);
    }

    async toggleInterface(routerID, interfaceName, enable = true) {
        const interfaces = await this.getInterfaces(routerID);
        const iface = interfaces.find(i => i.name === interfaceName);
        if (iface && iface['.id']) {
            const action = enable ? 'enable' : 'disable';
            return this.post(routerID, `/interface/${action}`, { '.id': iface['.id'] });
        }
        throw new Error(`Interface ${interfaceName} not found`);
    }

    async addSimpleQueue(routerID, { name, target, maxLimit, comment = '' }) {
        return this.put(routerID, '/queue/simple/add', {
            name,
            target,
            'max-limit': maxLimit,
            comment,
        });
    }

    async getLogs(routerID, limit = 50) {
        return this.execute(routerID, '/log/print');
    }

    checkRouterStatus(routerID) {
        return this.getIdentity(routerID)
            .then(() => ({ status: 'online', isOnline: true }))
            .catch(err => ({ status: 'offline', isOnline: false, error: err.message }));
    }

    async getRouterHealth(routerID) {
        try {
            const [resource, identity, sessions] = await Promise.all([
                this.getResource(routerID),
                this.getIdentity(routerID),
                this.getHotspotActive(routerID),
            ]);
            const r = resource[0] || {};
            const totalMem = parseInt(r['total-memory']) || 1;
            const freeMem = parseInt(r['free-memory']) || 0;
            return {
                status: 'online',
                connectedUsers: (sessions || []).length,
                cpu: Math.round(parseInt(r['cpu-load']) || 0),
                memory: Math.round(((totalMem - freeMem) / totalMem) * 100),
                uptime: r.uptime,
                version: r.version,
                identity: identity[0]?.name || 'Unknown',
                lastSeen: new Date(),
            };
        } catch (error) {
            return { status: 'offline', error: error.message, lastSeen: new Date() };
        }
    }

    async getFullRouterStatus(routerID) {
        try {
            const [identityResult, resourceResult, sessionsResult, interfacesResult] = await Promise.all([
                this.getIdentity(routerID).catch(() => [{}]),
                this.getResource(routerID).catch(() => [{}]),
                this.getHotspotActive(routerID).catch(() => []),
                this.getInterfaces(routerID).catch(() => []),
            ]);

            const identity = identityResult[0] || {};
            const resource = resourceResult[0] || {};
            const sessions = sessionsResult || [];
            const interfaces = interfacesResult || [];
            const totalMem = parseInt(resource['total-memory']) || 1;
            const freeMem = parseInt(resource['free-memory']) || 0;

            return {
                success: true,
                status: {
                    routerID,
                    identity: identity.name || 'Unknown',
                    isOnline: true,
                    uptime: resource.uptime || '0s',
                    version: resource.version || 'Unknown',
                    cpu: parseInt(resource['cpu-load']) || 0,
                    memory: Math.round(((totalMem - freeMem) / totalMem) * 100),
                    activeUsers: sessions.length,
                    interfaces: interfaces.filter(i => !i.disabled).length,
                    totalInterfaces: interfaces.length,
                    platform: resource.platform || 'Unknown',
                    lastChecked: new Date().toISOString(),
                },
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    cleanup() {
        this.connections.clear();
    }
}

module.exports = RouterOSRestClient;
