// utils/mikrotik.js
// Extended MikroTik Service with full remote management via WireGuard
const RouterOSAPI = require('node-routeros').RouterOSAPI;

class MikrotikService {
    constructor() {
        this.connections = new Map();
        this.connectionTimeout = 10000; // 10 seconds
    }

    /**
     * Get router connection - supports both direct and WireGuard connections
     * @param {string|number} routerID - Router ID from database
     * @returns {Promise<RouterOSAPI>} - Connected RouterOS API instance
     */
    async getRouterConnection(routerID) {
        try {
            // Check if we have an existing connection
            if (this.connections.has(routerID)) {
                const existingConn = this.connections.get(routerID);
                // Test if connection is still alive
                try {
                    await existingConn.write('/system/identity/print');
                    return existingConn;
                } catch (e) {
                    // Connection is dead, remove it
                    this.connections.delete(routerID);
                }
            }

            // Get router details from database
            const db = require('../config/database');
            const isNumericId = /^\d+$/.test(String(routerID));
            const [routers] = await db.execute(
                isNumericId
                    ? 'SELECT * FROM mikrotiks WHERE id = ?'
                    : 'SELECT * FROM mikrotiks WHERE router_id = ?',
                [isNumericId ? parseInt(routerID) : routerID]
            );

            if (routers.length === 0) {
                throw new Error(`Router ${routerID} not found in database`);
            }

            const router = routers[0];
            const dbWhere = isNumericId ? 'id = ?' : 'router_id = ?';
            const dbValue = isNumericId ? parseInt(routerID) : routerID;

            // Create new connection (works via WireGuard if host is WG IP)
            const conn = new RouterOSAPI({
                host: router.host,
                user: router.user,
                password: router.password,
                port: router.port || 8728,
                timeout: router.timeout || 10
            });

            await conn.connect();
            this.connections.set(routerID, conn);

            // Update router status
            await db.execute(
                `UPDATE mikrotiks SET status = "online", last_seen = NOW() WHERE ${dbWhere}`,
                [dbValue]
            );

            console.log(`✅ Connected to router ${router.router_name} (${router.host})`);
            return conn;
        } catch (error) {
            console.error(`❌ Router connection error for ${routerID}:`, error.message);

            // Update router status to offline
            const db = require('../config/database');
            const isNumericId = /^\d+$/.test(String(routerID));
            await db.execute(
                isNumericId
                    ? 'UPDATE mikrotiks SET status = "offline" WHERE id = ?'
                    : 'UPDATE mikrotiks SET status = "offline" WHERE router_id = ?',
                [isNumericId ? parseInt(routerID) : routerID]
            );

            throw error;
        }
    }

    /**
     * Disconnect a specific router
     */
    async disconnectRouter(routerID) {
        if (this.connections.has(routerID)) {
            try {
                const conn = this.connections.get(routerID);
                conn.close();
            } catch (e) {
                // Ignore close errors
            }
            this.connections.delete(routerID);
        }
    }

    async resolveRouterDbId(routerID) {
        const db = require('../config/database');
        if (/^\d+$/.test(String(routerID))) {
            return parseInt(routerID);
        }
        const [routers] = await db.execute(
            'SELECT id FROM mikrotiks WHERE router_id = ?',
            [routerID]
        );
        return routers.length > 0 ? routers[0].id : null;
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
            try {
                const db = require('../config/database');
                const dbRouterId = await this.resolveRouterDbId(routerID);
                await db.execute(
                    'INSERT INTO user_connection_logs (mac_address, router_id, action, error_message) VALUES (?, ?, "connect_failed", ?)',
                    [mac, dbRouterId, error.message]
                );
            } catch (logError) {
                console.error('Failed to log connection failure:', logError.message);
            }

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
                try {
                    const db = require('../config/database');
                    const dbRouterId = await this.resolveRouterDbId(routerID);
                    await db.execute(
                        'INSERT INTO user_connection_logs (mac_address, router_id, action) VALUES (?, ?, "disconnect")',
                        [mac, dbRouterId]
                    );
                } catch (logError) {
                    console.error('Failed to log disconnect:', logError.message);
                }
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

    async testConnection(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);

            const [resource] = await conn.write('/system/resource/print');
            const [identity] = await conn.write('/system/identity/print');
            const [board] = await conn.write('/system/routerboard/print');

            return {
                success: true,
                message: 'Connection successful',
                data: {
                    identity: identity.name || 'Unknown',
                    model: board['board-name'] || resource['board-name'] || 'Unknown',
                    firmware: resource.version || 'Unknown',
                    uptime: resource.uptime || '0s',
                    cpuLoad: resource['cpu-load'] || 0,
                    freeMemory: resource['free-memory'] || 0,
                    totalMemory: resource['total-memory'] || 0,
                    freeHdd: resource['free-hdd-space'] || 0,
                    totalHdd: resource['total-hdd-space'] || 0,
                    version: resource.version || 'Unknown',
                    boardName: board['board-name'] || null,
                    architectureName: board['architecture-name'] || null
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                data: null
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

            // Remove from connections since it will disconnect
            this.connections.delete(routerID);

            console.log(`🔄 Router ${routerID} reboot initiated`);
            return { success: true, message: 'Router rebooting...' };
        } catch (error) {
            console.error(`❌ Reboot router error:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // ==================== IP BINDING MANAGEMENT ====================

    /**
     * Get all IP bindings from hotspot
     */
    async getIpBindings(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            const bindings = await conn.write('/ip/hotspot/ip-binding/print');

            // Filter out empty results
            const clean = bindings.filter(item => item['!empty'] === undefined);
            return { success: true, bindings: clean };
        } catch (error) {
            console.error(`❌ Get IP bindings error:`, error.message);
            return { success: false, error: error.message, bindings: [] };
        }
    }

    /**
     * Add IP binding (bypass MAC/IP from hotspot login)
     */
    async addIpBinding(routerID, { mac, ip, type = 'bypassed', comment = '' }) {
        try {
            const conn = await this.getRouterConnection(routerID);

            const params = ['=type=' + type];
            if (mac) params.push('=mac-address=' + mac);
            if (ip) params.push('=address=' + ip);
            if (comment) params.push('=comment=' + comment);

            const result = await conn.write('/ip/hotspot/ip-binding/add', params);

            console.log(`✅ IP binding added: MAC=${mac}, IP=${ip}`);
            return { success: true, result };
        } catch (error) {
            console.error(`❌ Add IP binding error:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove IP binding by MAC or IP
     */
    async removeIpBinding(routerID, { mac, ip, bindingId }) {
        try {
            const conn = await this.getRouterConnection(routerID);

            if (bindingId) {
                // Remove by ID directly
                await conn.write('/ip/hotspot/ip-binding/remove', ['=.id=' + bindingId]);
                return { success: true, message: 'Binding removed' };
            }

            // Find bindings matching MAC or IP
            const filters = [];
            if (mac) filters.push('?mac-address=' + mac);
            if (ip) filters.push('?address=' + ip);

            const bindings = await conn.write('/ip/hotspot/ip-binding/print', filters);
            const clean = bindings.filter(item => item['!empty'] === undefined);

            if (clean.length === 0) {
                return { success: false, error: 'Binding not found' };
            }

            // Remove all matching bindings
            const removed = [];
            for (const binding of clean) {
                await conn.write('/ip/hotspot/ip-binding/remove', ['=.id=' + binding['.id']]);
                removed.push(binding);
            }

            return { success: true, removedCount: removed.length, removed };
        } catch (error) {
            console.error(`❌ Remove IP binding error:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // ==================== HOTSPOT SERVER MANAGEMENT ====================

    /**
     * Get all hotspot servers
     */
    async getHotspotServers(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            const servers = await conn.write('/ip/hotspot/print');
            return { success: true, servers };
        } catch (error) {
            console.error(`❌ Get hotspot servers error:`, error.message);
            return { success: false, error: error.message, servers: [] };
        }
    }

    /**
     * Enable/Disable hotspot server
     */
    async toggleHotspotServer(routerID, serverName, enable = true) {
        try {
            const conn = await this.getRouterConnection(routerID);

            // Find the server by name
            const servers = await conn.write('/ip/hotspot/print', ['?name=' + serverName]);

            if (servers.length === 0) {
                return { success: false, error: 'Hotspot server not found' };
            }

            const serverId = servers[0]['.id'];
            const command = enable ? '/ip/hotspot/enable' : '/ip/hotspot/disable';

            await conn.write(command, ['=.id=' + serverId]);

            console.log(`✅ Hotspot server ${serverName} ${enable ? 'enabled' : 'disabled'}`);
            return { success: true, message: `Hotspot ${enable ? 'enabled' : 'disabled'}` };
        } catch (error) {
            console.error(`❌ Toggle hotspot error:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get active hotspot sessions
     */
    async getActiveHotspotSessions(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            const sessions = await conn.write('/ip/hotspot/active/print');
            return { success: true, sessions, count: sessions.length };
        } catch (error) {
            console.error(`❌ Get active sessions error:`, error.message);
            return { success: false, error: error.message, sessions: [], count: 0 };
        }
    }

    /**
     * Kick/disconnect active user from hotspot
     */
    async kickHotspotUser(routerID, sessionId) {
        try {
            const conn = await this.getRouterConnection(routerID);
            await conn.write('/ip/hotspot/active/remove', ['=.id=' + sessionId]);

            console.log(`✅ User kicked from hotspot`);
            return { success: true, message: 'User disconnected' };
        } catch (error) {
            console.error(`❌ Kick user error:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // ==================== SYSTEM MANAGEMENT ====================

    /**
     * Get system identity
     */
    async getSystemIdentity(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            const [identity] = await conn.write('/system/identity/print');
            return { success: true, identity: identity.name };
        } catch (error) {
            console.error(`❌ Get identity error:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Set system identity
     */
    async setSystemIdentity(routerID, name) {
        try {
            const conn = await this.getRouterConnection(routerID);
            await conn.write('/system/identity/set', ['=name=' + name]);

            console.log(`✅ Router identity set to: ${name}`);
            return { success: true, message: 'Identity updated' };
        } catch (error) {
            console.error(`❌ Set identity error:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get system resource (CPU, memory, uptime, etc.)
     */
    async getSystemResource(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            const [resource] = await conn.write('/system/resource/print');

            return {
                success: true,
                resource: {
                    uptime: resource.uptime,
                    version: resource.version,
                    buildTime: resource['build-time'],
                    cpuLoad: parseInt(resource['cpu-load']) || 0,
                    cpuCount: parseInt(resource['cpu-count']) || 1,
                    cpuFrequency: parseInt(resource['cpu-frequency']) || 0,
                    freeMemory: parseInt(resource['free-memory']) || 0,
                    totalMemory: parseInt(resource['total-memory']) || 0,
                    freeHddSpace: parseInt(resource['free-hdd-space']) || 0,
                    totalHddSpace: parseInt(resource['total-hdd-space']) || 0,
                    architectureName: resource['architecture-name'],
                    boardName: resource['board-name'],
                    platform: resource.platform
                }
            };
        } catch (error) {
            console.error(`❌ Get system resource error:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get router board info
     */
    async getRouterBoard(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            const [board] = await conn.write('/system/routerboard/print');
            return { success: true, board };
        } catch (error) {
            console.error(`❌ Get routerboard error:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Shutdown router
     */
    async shutdownRouter(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            await conn.write('/system/shutdown');

            this.connections.delete(routerID);
            console.log(`🛑 Router ${routerID} shutdown initiated`);
            return { success: true, message: 'Router shutting down...' };
        } catch (error) {
            console.error(`❌ Shutdown router error:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // ==================== INTERFACE MANAGEMENT ====================

    /**
     * Get all interfaces
     */
    async getInterfaces(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            const interfaces = await conn.write('/interface/print');
            return { success: true, interfaces };
        } catch (error) {
            console.error(`❌ Get interfaces error:`, error.message);
            return { success: false, error: error.message, interfaces: [] };
        }
    }

    /**
     * Enable/Disable interface
     */
    async toggleInterface(routerID, interfaceName, enable = true) {
        try {
            const conn = await this.getRouterConnection(routerID);

            const interfaces = await conn.write('/interface/print', ['?name=' + interfaceName]);
            if (interfaces.length === 0) {
                return { success: false, error: 'Interface not found' };
            }

            const interfaceId = interfaces[0]['.id'];
            const command = enable ? '/interface/enable' : '/interface/disable';

            await conn.write(command, ['=.id=' + interfaceId]);

            console.log(`✅ Interface ${interfaceName} ${enable ? 'enabled' : 'disabled'}`);
            return { success: true, message: `Interface ${enable ? 'enabled' : 'disabled'}` };
        } catch (error) {
            console.error(`❌ Toggle interface error:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get wireless interfaces
     */
    async getWirelessInterfaces(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            const wireless = await conn.write('/interface/wireless/print');
            return { success: true, wireless };
        } catch (error) {
            console.error(`❌ Get wireless error:`, error.message);
            return { success: false, error: error.message, wireless: [] };
        }
    }

    // ==================== HOTSPOT USER MANAGEMENT ====================

    /**
     * Get all hotspot users
     */
    async getHotspotUsersList(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            const users = await conn.write('/ip/hotspot/user/print');
            return { success: true, users };
        } catch (error) {
            console.error(`❌ Get hotspot users error:`, error.message);
            return { success: false, error: error.message, users: [] };
        }
    }

    /**
     * Add hotspot user
     */
    async addHotspotUser(routerID, { name, password, profile = 'default', comment = '' }) {
        try {
            const conn = await this.getRouterConnection(routerID);

            const params = [
                '=name=' + name,
                '=password=' + password,
                '=profile=' + profile
            ];
            if (comment) params.push('=comment=' + comment);

            await conn.write('/ip/hotspot/user/add', params);

            console.log(`✅ Hotspot user added: ${name}`);
            return { success: true, message: 'User added successfully' };
        } catch (error) {
            console.error(`❌ Add hotspot user error:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove hotspot user
     */
    async removeHotspotUser(routerID, username) {
        try {
            const conn = await this.getRouterConnection(routerID);

            const users = await conn.write('/ip/hotspot/user/print', ['?name=' + username]);
            if (users.length === 0) {
                return { success: false, error: 'User not found' };
            }

            await conn.write('/ip/hotspot/user/remove', ['=.id=' + users[0]['.id']]);

            console.log(`✅ Hotspot user removed: ${username}`);
            return { success: true, message: 'User removed successfully' };
        } catch (error) {
            console.error(`❌ Remove hotspot user error:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get hotspot user profiles
     */
    async getHotspotProfiles(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            const profiles = await conn.write('/ip/hotspot/user/profile/print');
            return { success: true, profiles };
        } catch (error) {
            console.error(`❌ Get profiles error:`, error.message);
            return { success: false, error: error.message, profiles: [] };
        }
    }

    // ==================== LOG MANAGEMENT ====================

    /**
     * Get system logs
     */
    async getSystemLogs(routerID, limit = 50) {
        try {
            const conn = await this.getRouterConnection(routerID);
            const logs = await conn.write('/log/print');

            // Return last N logs
            const recentLogs = logs.slice(-limit);
            return { success: true, logs: recentLogs };
        } catch (error) {
            console.error(`❌ Get logs error:`, error.message);
            return { success: false, error: error.message, logs: [] };
        }
    }

    // ==================== BANDWIDTH/QUEUE MANAGEMENT ====================

    /**
     * Get simple queues
     */
    async getSimpleQueues(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);
            const queues = await conn.write('/queue/simple/print');
            return { success: true, queues };
        } catch (error) {
            console.error(`❌ Get queues error:`, error.message);
            return { success: false, error: error.message, queues: [] };
        }
    }

    /**
     * Add simple queue for bandwidth control
     */
    async addSimpleQueue(routerID, { name, target, maxLimit, comment = '' }) {
        try {
            const conn = await this.getRouterConnection(routerID);

            const params = [
                '=name=' + name,
                '=target=' + target,
                '=max-limit=' + maxLimit
            ];
            if (comment) params.push('=comment=' + comment);

            await conn.write('/queue/simple/add', params);

            console.log(`✅ Queue added: ${name}`);
            return { success: true, message: 'Queue added successfully' };
        } catch (error) {
            console.error(`❌ Add queue error:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // ==================== COMPREHENSIVE STATUS ====================

    /**
     * Get complete router status (for dashboard)
     */
    async getFullRouterStatus(routerID) {
        try {
            const conn = await this.getRouterConnection(routerID);

            // Fetch all data in parallel
            const [
                identityResult,
                resourceResult,
                sessionsResult,
                interfacesResult
            ] = await Promise.all([
                conn.write('/system/identity/print').catch(() => [{}]),
                conn.write('/system/resource/print').catch(() => [{}]),
                conn.write('/ip/hotspot/active/print').catch(() => []),
                conn.write('/interface/print').catch(() => [])
            ]);

            const identity = identityResult[0] || {};
            const resource = resourceResult[0] || {};
            const sessions = sessionsResult || [];
            const interfaces = interfacesResult || [];

            // Calculate memory usage percentage
            const totalMem = parseInt(resource['total-memory']) || 1;
            const freeMem = parseInt(resource['free-memory']) || 0;
            const memoryUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);

            return {
                success: true,
                status: {
                    routerID,
                    identity: identity.name || 'Unknown',
                    isOnline: true,
                    uptime: resource.uptime || '0s',
                    version: resource.version || 'Unknown',
                    cpu: parseInt(resource['cpu-load']) || 0,
                    memory: memoryUsage,
                    activeUsers: sessions.length,
                    interfaces: interfaces.filter(i => !i.disabled).length,
                    totalInterfaces: interfaces.length,
                    platform: resource.platform || 'Unknown',
                    boardName: resource['board-name'] || 'Unknown',
                    lastChecked: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error(`❌ Get full status error:`, error.message);
            return {
                success: false,
                status: {
                    routerID,
                    identity: 'Unknown',
                    isOnline: false,
                    error: error.message,
                    lastChecked: new Date().toISOString()
                }
            };
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