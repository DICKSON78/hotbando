const db = require('../config/database');
const { isRedisReady } = require('../config/redis');

async function healthCheck() {
    const result = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        checks: {},
    };

    // Database check
    try {
        const [dbResult] = await db.execute('SELECT 1 as alive');
        result.checks.database = {
            status: dbResult[0]?.alive === 1 ? 'healthy' : 'unhealthy',
        };
    } catch (error) {
        result.checks.database = { status: 'unhealthy', error: error.message };
        result.status = 'degraded';
    }

    // Redis check
    result.checks.redis = {
        status: isRedisReady() ? 'healthy' : 'disabled',
    };

    // Session store check
    try {
        const [sessionResult] = await db.execute(
            'SELECT COUNT(*) as count FROM sessions WHERE expires > UNIX_TIMESTAMP()'
        );
        result.checks.sessions = {
            status: 'healthy',
            activeSessions: sessionResult[0]?.count || 0,
        };
    } catch (error) {
        result.checks.sessions = { status: 'unhealthy', error: error.message };
        result.status = 'degraded';
    }

    // Router connectivity check
    try {
        const [routerResult] = await db.execute(
            "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online FROM mikrotiks"
        );
        result.checks.routers = {
            status: routerResult[0]?.online > 0 ? 'healthy' : 'degraded',
            total: routerResult[0]?.total || 0,
            online: routerResult[0]?.online || 0,
        };
    } catch (error) {
        result.checks.routers = { status: 'unhealthy', error: error.message };
        result.status = 'degraded';
    }

    // Disk space check
    try {
        const { execSync } = require('child_process');
        const df = execSync('df -h / | tail -1').toString().trim();
        const parts = df.split(/\s+/);
        result.checks.disk = {
            status: parseInt(parts[4]) < 90 ? 'healthy' : 'degraded',
            used: parts[4],
            available: parts[3],
        };
    } catch {
        result.checks.disk = { status: 'unknown' };
    }

    if (result.status === 'degraded') {
        const allUnhealthy = Object.values(result.checks).every(
            (c) => c.status === 'unhealthy' || c.status === 'disabled' || c.status === 'unknown'
        );
        if (allUnhealthy) result.status = 'unhealthy';
    }

    return result;
}

module.exports = { healthCheck };
