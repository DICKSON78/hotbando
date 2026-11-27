/**
 * Schema-aware helpers for the OPTIONAL `hotspot_sessions` table.
 *
 * Some production databases do not have this table. Admin router queries must
 * keep working in that case, falling back to `users` data for customer counts.
 *
 * Detection is read-only (information_schema) and cached briefly. The cache is
 * never used to write anything — it only chooses which SELECT fragment to use.
 */

const db = require('../config/database');

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached = null; // null = unknown, true/false = known
let cachedAt = 0;

async function hasHotspotSessions() {
    const now = Date.now();
    if (cached !== null && now - cachedAt < CACHE_TTL_MS) return cached;

    try {
        const [rows] = await db.execute(
            `SELECT COUNT(*) AS n FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hotspot_sessions'`
        );
        cached = Number(rows && rows[0] && rows[0].n) > 0;
    } catch (e) {
        // Detection failure must never break admin requests: assume absent.
        cached = false;
    }
    cachedAt = now;
    return cached;
}

function resetHotspotSessionsCache() {
    cached = null;
    cachedAt = 0;
}

/**
 * SQL fragments for counting customers per router.
 *
 * - hasSessions === true : identical logic to the original queries (joins the
 *   hotspot_sessions table for router association).
 * - hasSessions === false: falls back to `users` data only, preserving customer
 *   counts via users.last_router_id.
 */
function routerCustomerCountSql(hasSessions) {
    if (hasSessions) {
        return {
            customerCount: `(SELECT COUNT(DISTINCT u.id) FROM users u 
                   LEFT JOIN hotspot_sessions hs ON hs.user_id = u.id AND (hs.router_id = m.router_id OR hs.router_id = m.id)
                   WHERE u.role = 'customer' AND (
                     u.last_router_id = m.router_id OR 
                     u.last_router_id = m.id OR 
                     hs.router_id = m.router_id OR 
                     hs.router_id = m.id
                   ))`,
            activeBundleUsers: `(SELECT COUNT(DISTINCT u.id) FROM users u 
                   LEFT JOIN hotspot_sessions hs ON hs.user_id = u.id AND (hs.router_id = m.router_id OR hs.router_id = m.id)
                   WHERE u.role = 'customer' AND (
                     u.last_router_id = m.router_id OR 
                     u.last_router_id = m.id OR 
                     hs.router_id = m.router_id OR 
                     hs.router_id = m.id
                   ) AND u.usage_until IS NOT NULL AND u.usage_until > NOW())`,
            activeUsersCount: `(SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN hotspot_sessions hs ON hs.user_id = u.id AND (hs.router_id = m.router_id OR hs.router_id = m.id) WHERE u.role = 'customer' AND (u.last_router_id = m.router_id OR u.last_router_id = m.id OR hs.router_id = m.router_id OR hs.router_id = m.id) AND u.usage_until IS NOT NULL AND u.usage_until > NOW())`
        };
    }

    return {
        customerCount: `(SELECT COUNT(DISTINCT u.id) FROM users u
                   WHERE u.role = 'customer' AND (
                     u.last_router_id = m.router_id OR
                     u.last_router_id = m.id
                   ))`,
        activeBundleUsers: `(SELECT COUNT(DISTINCT u.id) FROM users u
                   WHERE u.role = 'customer' AND (
                     u.last_router_id = m.router_id OR
                     u.last_router_id = m.id
                   ) AND u.usage_until IS NOT NULL AND u.usage_until > NOW())`,
        activeUsersCount: `(SELECT COUNT(DISTINCT u.id) FROM users u WHERE u.role = 'customer' AND (u.last_router_id = m.router_id OR u.last_router_id = m.id) AND u.usage_until IS NOT NULL AND u.usage_until > NOW())`
    };
}

module.exports = {
    hasHotspotSessions,
    resetHotspotSessionsCache,
    routerCustomerCountSql
};
