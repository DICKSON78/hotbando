const client = require('prom-client');
const db = require('../config/database');

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'hotbando_' });

const httpRequestDuration = new client.Histogram({
    name: 'hotbando_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new client.Counter({
    name: 'hotbando_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
});

const activeUsersGauge = new client.Gauge({
    name: 'hotbando_active_users',
    help: 'Number of active users (unexpired sessions)',
});

const onlineRoutersGauge = new client.Gauge({
    name: 'hotbando_online_routers',
    help: 'Number of online routers',
});

const totalRoutersGauge = new client.Gauge({
    name: 'hotbando_total_routers',
    help: 'Total registered routers',
});

const activeCampaignsGauge = new client.Gauge({
    name: 'hotbando_active_campaigns',
    help: 'Number of active campaigns',
});

const walletBalanceGauge = new client.Gauge({
    name: 'hotbando_wallet_balance_total',
    help: 'Total balance across all wallets',
});

const dailyRevenueGauge = new client.Gauge({
    name: 'hotbando_daily_revenue',
    help: 'Daily revenue total',
});

const cacheHitCounter = new client.Counter({
    name: 'hotbando_cache_hits_total',
    help: 'Total cache hits',
});

const cacheMissCounter = new client.Counter({
    name: 'hotbando_cache_misses_total',
    help: 'Total cache misses',
});

const campaignCompletionsCounter = new client.Counter({
    name: 'hotbando_campaign_completions_total',
    help: 'Total campaign completions',
    labelNames: ['type'],
});

function recordMetrics(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;
        httpRequestDuration.observe({ method: req.method, route, status: res.statusCode }, duration);
        httpRequestTotal.inc({ method: req.method, route, status: res.statusCode });
    });
    next();
}

async function refreshMetrics() {
    try {
        const [activeUsers] = await db.execute(
            "SELECT COUNT(*) as count FROM users WHERE usage_until > NOW() AND role = 'customer'"
        );
        activeUsersGauge.set(activeUsers[0].count || 0);

        const [onlineRouters] = await db.execute(
            "SELECT COUNT(*) as count FROM mikrotiks WHERE status = 'online'"
        );
        onlineRoutersGauge.set(onlineRouters[0].count || 0);

        const [totalRouters] = await db.execute('SELECT COUNT(*) as count FROM mikrotiks');
        totalRoutersGauge.set(totalRouters[0].count || 0);

        const [activeCampaigns] = await db.execute(
            "SELECT COUNT(*) as count FROM campaigns WHERE is_active = 1"
        );
        activeCampaignsGauge.set(activeCampaigns[0].count || 0);

        const [walletBalance] = await db.execute(
            'SELECT COALESCE(SUM(balance), 0) as total FROM wallets'
        );
        walletBalanceGauge.set(parseFloat(walletBalance[0].total) || 0);

        const [dailyRevenue] = await db.execute(
            "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE DATE(created_at) = CURDATE() AND status = 'completed'"
        );
        dailyRevenueGauge.set(parseFloat(dailyRevenue[0].total) || 0);

        const [todayCompletions] = await db.execute(
            "SELECT COUNT(*) as count FROM campaign_completions WHERE DATE(completed_at) = CURDATE()"
        );
        campaignCompletionsCounter.inc({ type: 'daily' }, todayCompletions[0].count || 0);
    } catch (error) {
        console.error('Metrics refresh error:', error.message);
    }
}

async function metricsMiddleware(req, res) {
    try {
        const metrics = await client.register.metrics();
        res.set('Content-Type', client.register.contentType);
        res.end(metrics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

function cacheHit() { cacheHitCounter.inc(); }
function cacheMiss() { cacheMissCounter.inc(); }

setInterval(refreshMetrics, 30000);

module.exports = {
    recordMetrics,
    metricsMiddleware,
    refreshMetrics,
    cacheHit,
    cacheMiss,
};
