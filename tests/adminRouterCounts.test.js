// Regression tests: admin router queries must work whether or not the
// optional `hotspot_sessions` table exists in the production database.
// No real database is touched — db.execute is mocked for both states.

jest.mock('../config/database', () => ({
    execute: jest.fn()
}));

// adminController pulls this in at require-time; keep it inert.
jest.mock('../utils/mikrotik', () => ({}));

const db = require('../config/database');
const support = require('../utils/hotspotSessionsSupport');
const adminController = require('../controllers/adminController');

function mockRes() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}

beforeEach(() => {
    jest.clearAllMocks();
    support.resetHotspotSessionsCache();
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('hotspotSessionsSupport (schema detection)', () => {
    test('reports the table present', async () => {
        db.execute.mockResolvedValueOnce([[{ n: 1 }]]);
        await expect(support.hasHotspotSessions()).resolves.toBe(true);
    });

    test('reports the table absent', async () => {
        db.execute.mockResolvedValueOnce([[{ n: 0 }]]);
        await expect(support.hasHotspotSessions()).resolves.toBe(false);
    });

    test('a detection failure is treated as absent (never breaks admin)', async () => {
        db.execute.mockRejectedValueOnce(new Error('information_schema unavailable'));
        await expect(support.hasHotspotSessions()).resolves.toBe(false);
    });

    test('count SQL only references hotspot_sessions when the table exists', () => {
        const present = support.routerCustomerCountSql(true);
        expect(present.customerCount).toContain('hotspot_sessions');
        expect(present.activeBundleUsers).toContain('hotspot_sessions');
        expect(present.activeUsersCount).toContain('hotspot_sessions');

        const absent = support.routerCustomerCountSql(false);
        expect(absent.customerCount).not.toContain('hotspot_sessions');
        expect(absent.activeBundleUsers).not.toContain('hotspot_sessions');
        expect(absent.activeUsersCount).not.toContain('hotspot_sessions');
        // Still counts customers from users data.
        expect(absent.customerCount).toContain('users');
        expect(absent.customerCount).toContain('last_router_id');
    });
});

describe('getRouters — table absent', () => {
    test('query omits hotspot_sessions and returns routers successfully', async () => {
        db.execute
            .mockResolvedValueOnce([[{ n: 0 }]]) // detection
            .mockResolvedValueOnce([[
                { id: 1, router_id: 'RT-1', customer_count: 3, active_bundle_users: 2, password: 'secret', wireguard_private_key: 'priv' }
            ]]);

        const res = mockRes();
        await adminController.getRouters({}, res);

        const sql = db.execute.mock.calls[1][0];
        expect(sql).not.toContain('hotspot_sessions');
        expect(sql).toContain('customer_count');
        expect(sql).toContain('active_bundle_users');

        expect(res.status).not.toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 1 }));

        const body = res.json.mock.calls[0][0];
        expect(body.routers[0].password).toBeUndefined();
        expect(body.routers[0].wireguard_private_key).toBeUndefined();
    });

    test('empty result still succeeds (no ER_NO_SUCH_TABLE)', async () => {
        db.execute
            .mockResolvedValueOnce([[{ n: 0 }]])
            .mockResolvedValueOnce([[]]);

        const res = mockRes();
        await adminController.getRouters({}, res);

        expect(res.status).not.toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 0 }));
    });
});

describe('getRouters — table present', () => {
    test('query keeps the original hotspot_sessions joins', async () => {
        db.execute
            .mockResolvedValueOnce([[{ n: 1 }]])
            .mockResolvedValueOnce([[{ id: 1, router_id: 'RT-1', customer_count: 5, active_bundle_users: 4 }]]);

        const res = mockRes();
        await adminController.getRouters({}, res);

        const sql = db.execute.mock.calls[1][0];
        expect(sql).toContain('hotspot_sessions');
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 1 }));
    });
});

describe('getRouterDetails — both states', () => {
    test('table absent: query omits hotspot_sessions and returns details', async () => {
        db.execute
            .mockResolvedValueOnce([[{ n: 0 }]])
            .mockResolvedValueOnce([[{ id: 1, router_id: 'RT-1', active_users_count: 2 }]]);

        const res = mockRes();
        await adminController.getRouterDetails({ params: { routerID: 'RT-1' } }, res);

        const sql = db.execute.mock.calls[1][0];
        expect(sql).not.toContain('hotspot_sessions');
        expect(sql).toContain('active_users_count');
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('table present: query keeps the hotspot_sessions join', async () => {
        db.execute
            .mockResolvedValueOnce([[{ n: 1 }]])
            .mockResolvedValueOnce([[{ id: 1, router_id: 'RT-1', active_users_count: 2 }]]);

        const res = mockRes();
        await adminController.getRouterDetails({ params: { routerID: 'RT-1' } }, res);

        const sql = db.execute.mock.calls[1][0];
        expect(sql).toContain('hotspot_sessions');
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('table absent: missing router returns 404, not a table error', async () => {
        db.execute
            .mockResolvedValueOnce([[{ n: 0 }]])
            .mockResolvedValueOnce([[]]);

        const res = mockRes();
        await adminController.getRouterDetails({ params: { routerID: 'MISSING' } }, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });
});
