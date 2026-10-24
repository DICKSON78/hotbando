/**
 * Background scheduler — disconnects expired package users from MikroTik
 * and enforces ad timing. Runs every 60 seconds.
 */

const db = require('../config/database');
const mikrotikService = require('./mikrotik');

class ExpiryScheduler {
    constructor() {
        this.running = false;
        this.interval = null;
    }

    start(intervalMs = 60000) {
        if (this.interval) return;
        this.interval = setInterval(() => this.tick(), intervalMs);
        console.log(`⏰ Expiry scheduler started (every ${intervalMs / 1000}s)`);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    async tick() {
        if (this.running) return;
        this.running = true;

        try {
            await this.disconnectExpiredUsers();
            await this.consumeFreeBytes();
        } catch (err) {
            console.error('⚠️ Expiry scheduler error:', err.message);
        } finally {
            this.running = false;
        }
    }

    /**
     * Charge closed RADIUS sessions against free_bytes. Each `disconnect'
     * accounting row is charged exactly once (bytes_charged=1), so free
     * data is finite. Users hitting 0 with no paid time are cut off.
     */
    async consumeFreeBytes() {
        try {
            const [rows] = await db.execute(`
                SELECT user_id,
                       SUM(bytes_uploaded + bytes_downloaded) AS bytes_used
                FROM user_connection_logs
                WHERE action = 'disconnect' AND bytes_charged = 0 AND user_id IS NOT NULL
                GROUP BY user_id
            `);
            if (rows.length === 0) return;

            for (const r of rows) {
                const used = Number(r.bytes_used) || 0;
                if (used <= 0) {
                    await db.execute(
                        'UPDATE user_connection_logs SET bytes_charged = 1 WHERE action = \'disconnect\' AND bytes_charged = 0 AND user_id = ?',
                        [r.user_id]
                    );
                    continue;
                }
                await db.execute(
                    'UPDATE users SET free_bytes = GREATEST(0, free_bytes - ?), updated_at = NOW() WHERE id = ?',
                    [used, r.user_id]
                );
                await db.execute(
                    'UPDATE user_connection_logs SET bytes_charged = 1 WHERE action = \'disconnect\' AND bytes_charged = 0 AND user_id = ?',
                    [r.user_id]
                );
                const [users] = await db.execute(
                    'SELECT id, name, mac_address, last_router_id, free_bytes, usage_until FROM users WHERE id = ?',
                    [r.user_id]
                );
                const u = users[0];
                if (!u) continue;
                const hasTime = u.usage_until && new Date(u.usage_until) > new Date();
                if (Number(u.free_bytes) <= 0 && !hasTime && u.mac_address && u.last_router_id) {
                    try {
                        await mikrotikService.removeUserFromRouter(u.mac_address, u.last_router_id);
                        console.log(`⏰ Free data exhausted — disconnected ${u.name}`);
                    } catch (e) {
                        console.warn(`⏰ Could not disconnect exhausted user ${u.name}: ${e.message}`);
                    }
                }
            }
        } catch (error) {
            console.error('⏰ Free-bytes consumption error:', error.message);
        }
    }

    /**
     * Find all users whose package has expired and disconnect them from MikroTik.
     * Also deactivates their hotspot session on the router.
     */
    async disconnectExpiredUsers() {
        try {
            // Find users who have a paid package (not free tier) that has expired
            // and are still marked with a future usage_until OR have an active MikroTik session
            const [expiredUsers] = await db.execute(`
                SELECT id, name, phone_number, mac_address, last_router_id, usage_until, package
                FROM users
                WHERE role = 'customer'
                  AND is_active = 1
                  AND package != 'KARIBU HOT BANDO'
                  AND usage_until IS NOT NULL
                  AND usage_until < NOW()
            `);

            if (expiredUsers.length === 0) return;

            console.log(`⏰ Found ${expiredUsers.length} expired package user(s)`);

            for (const user of expiredUsers) {
                // Always reset the DB grant, even when the router is
                // unreachable or MAC/router is unknown (no silent survivors).
                if (user.mac_address && user.last_router_id) {
                    try {
                        const conn = await mikrotikService.getRouterConnection(user.last_router_id);

                        // Find and remove the user's active hotspot session
                        const sessions = await conn.write('/ip/hotspot/active/print', [
                            `?mac-address=${user.mac_address}`
                        ]);

                        if (sessions.length > 0) {
                            for (const session of sessions) {
                                await conn.write('/ip/hotspot/active/remove', [
                                    `=.id=${session['.id']}`
                                ]);
                            }
                            console.log(`⏰ Disconnected expired user ${user.name} (${user.phone_number}) from ${user.last_router_id}`);
                        }
                    } catch (routerErr) {
                        console.warn(`⏰ Could not disconnect ${user.name} from ${user.last_router_id}: ${routerErr.message}`);
                    }
                }

                // Reset package to free tier
                await db.execute(
                    `UPDATE users SET package = 'KARIBU HOT BANDO', usage_until = NULL, usage_start = NULL, updated_at = NOW() WHERE id = ?`,
                    [user.id]
                );

                // Log the event (action must be in enum: connect/disconnect/timeout/kicked/error)
                try {
                    const [dbRouter] = await db.execute(
                        'SELECT id FROM mikrotiks WHERE router_id = ?',
                        [user.last_router_id]
                    );
                    if (dbRouter.length > 0) {
                        await db.execute(
                            'INSERT INTO user_connection_logs (mac_address, router_id, user_id, action, error_message) VALUES (?, ?, ?, "disconnect", "Package expired")',
                            [user.mac_address, dbRouter[0].id, user.id]
                        );
                    }
                } catch (_) {}
            }
        } catch (error) {
            console.error('⏰ Expiry check error:', error.message);
        }
    }
}

module.exports = new ExpiryScheduler();
