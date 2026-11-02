const db = require('../config/database');
const logger = require('./logger');

const STALE_THRESHOLD_MINUTES = 10;

async function checkStaleRouters() {
    try {
        const [rows] = await db.execute(`
            SELECT router_id, router_name, status, setup_status, last_seen,
                   TIMESTAMPDIFF(MINUTE, last_seen, NOW()) as minutes_since_seen
            FROM mikrotiks
            WHERE setup_status = 'configured'
              AND (last_seen IS NULL OR last_seen < DATE_SUB(NOW(), INTERVAL ? MINUTE))
        `, [STALE_THRESHOLD_MINUTES]);

        if (rows.length > 0) {
            for (const row of rows) {
                logger.warn(`Router ${row.router_id} (${row.router_name}) is stale - last seen ${row.minutes_since_seen || '?'} minutes ago. Status: ${row.status}`);
            }
        }
    } catch (error) {
        logger.error('Stale router check failed:', error.message);
    }
}

function startStaleRouterMonitor() {
    // Check every 5 minutes
    setInterval(checkStaleRouters, 5 * 60 * 1000);
    // Run once on startup
    checkStaleRouters();
}

module.exports = { checkStaleRouters, startStaleRouterMonitor };
