// utils/mikrotik.js
const RouterOSAPI = require('node-routeros').RouterOSAPI;

class MikrotikService {
    constructor() {
        this.connections = new Map();
    }

    async getRouterConnection(routerID) {
        try {
            if (this.connections.has(routerID)) {
                return this.connections.get(routerID);
            }

            // Get router details from database
            const db = require('../config/database');
            const [routers] = await db.execute(
                'SELECT * FROM mikrotiks WHERE router_id = ?',
                [routerID]
            );

            if (routers.length === 0) {
                throw new Error(`Router ${routerID} not found in database`);
            }

            const router = routers[0];
            const conn = new RouterOSAPI({
                host: router.host,
                user: router.user,
                password: router.password,
                port: router.port || 8728,
                timeout: router.timeout || 3
            });

            await conn.connect();
            this.connections.set(routerID, conn);
            
            // Update router status
            await db.execute(
                'UPDATE mikrotiks SET status = "online", last_seen = NOW() WHERE router_id = ?',
                [routerID]
            );

            return conn;
        } catch (error) {
            console.error(`❌ Router connection error for ${routerID}:`, error.message);
            
            // Update router status to offline
            const db = require('../config/database');
            await db.execute(
                'UPDATE mikrotiks SET status = "offline" WHERE router_id = ?',
                [routerID]
            );

            throw error;
        }
    }

    async addUserToRouter(mac, routerID, uptime = 0, bytes = 0) {
        try {
            const conn = await this.getRouterConnection(routerID);
            
            // Add user to hotspot
            await conn.write('/ip/hotspot/active/add', [
                `=mac-address=${mac}`,
                `=server=hotspot1`,
                `=uptime=${uptime}`,
                `=bytes-in=${bytes}`,
                `=bytes-out=0`
            ]);

            console.log(`✅ User ${mac} added to router ${routerID}`);
            return true;
        } catch (error) {
            console.error(`❌ Add user to router error:`, error.message);
            
            // Log connection failure
            const db = require('../config/database');
            await db.execute(
                'INSERT INTO user_connection_logs (mac_address, router_id, action, error_message) VALUES (?, ?, "connect_failed", ?)',
                [mac, routerID, error.message]
            );

            return false;
        }
    }

    async removeUserFromRouter(mac, routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            
            // Find active session
            const sessions = await conn.write('/ip/hotspot/active/print', [
                `?mac-address=${mac}`
            ]);
            
            if (sessions.length > 0) {
                for (const session of sessions) {
                    await conn.write('/ip/hotspot/active/remove', [
                        `=.id=${session['.id']}`
                    ]);
                }
                console.log(`✅ User ${mac} removed from router ${routerID}`);
                
                // Log successful disconnect
                const db = require('../config/database');
                await db.execute(
                    'INSERT INTO user_connection_logs (mac_address, router_id, action) VALUES (?, ?, "disconnect")',
                    [mac, routerID]
                );
            }
            
            return true;
        } catch (error) {
            console.error(`❌ Remove user from router error:`, error.message);
            return false;
        }
    }

    async getActiveSessions(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            const sessions = await conn.write('/ip/hotspot/active/print');
            return sessions;
        } catch (error) {
            console.error(`❌ Get active sessions error:`, error.message);
            return [];
        }
    }

    async getHotspotUsers(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            const users = await conn.write('/ip/hotspot/user/print');
            return users;
        } catch (error) {
            console.error(`❌ Get hotspot users error:`, error.message);
            return [];
        }
    }

    async checkRouterStatus(routerID) {
        try {
            await this.getRouterConnection(routerID);
            return {
                status: 'online',
                isOnline: true,
                message: 'Router is connected and responsive'
            };
        } catch (error) {
            return {
                status: 'offline',
                isOnline: false,
                message: error.message
            };
        }
    }

    async getRouterHealth(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            
            // Get system resources
            const [resource] = await conn.write('/system/resource/print');
            const [identity] = await conn.write('/system/identity/print');
            const sessions = await this.getActiveSessions(routerID);
            
            return {
                routerID: routerID,
                status: 'online',
                connectedUsers: sessions.length,
                cpu: Math.round(resource['cpu-load'] || 0),
                memory: Math.round(((resource['total-memory'] - resource['free-memory']) / resource['total-memory']) * 100),
                uptime: resource.uptime,
                version: resource.version,
                identity: identity.name,
                lastSeen: new Date()
            };
        } catch (error) {
            return {
                routerID: routerID,
                status: 'offline',
                connectedUsers: 0,
                cpu: 0,
                memory: 0,
                uptime: '0s',
                version: 'unknown',
                identity: 'unknown',
                lastSeen: new Date()
            };
        }
    }

    async rebootRouter(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            await conn.write('/system/reboot', []);
            
            console.log(`🔄 Router ${routerID} reboot initiated`);
            return true;
        } catch (error) {
            console.error(`❌ Reboot router error:`, error.message);
            return false;
        }
    }

    async getSystemHealth() {
        try {
            const db = require('../config/database');
            
            // Get online routers count
            const [onlineRouters] = await db.execute('SELECT COUNT(*) as count FROM mikrotiks WHERE status = "online"');
            const [totalRouters] = await db.execute('SELECT COUNT(*) as count FROM mikrotiks');
            
            // Get active users count
            const [activeUsers] = await db.execute('SELECT COUNT(*) as count FROM users WHERE usage_until > NOW() AND role = "customer"');
            
            // Get system load (simulated)
            const systemLoad = Math.floor(Math.random() * 100);
            
            return {
                status: systemLoad < 80 ? 'healthy' : 'degraded',
                onlineRouters: onlineRouters[0].count,
                totalRouters: totalRouters[0].count,
                activeUsers: activeUsers[0].count,
                systemLoad: systemLoad,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ Get system health error:', error);
            return {
                status: 'unknown',
                onlineRouters: 0,
                totalRouters: 0,
                activeUsers: 0,
                systemLoad: 0,
                timestamp: new Date()
            };
        }
    }

    // Cleanup connections
    cleanup() {
        for (const [routerID, conn] of this.connections) {
            try {
                conn.close();
            } catch (error) {
                console.error(`Cleanup error for ${routerID}:`, error.message);
            }
        }
        this.connections.clear();
    }
}

module.exports = new MikrotikService();