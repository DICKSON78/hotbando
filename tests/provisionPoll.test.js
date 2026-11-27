/**
 * Router provisioning poll — GET /api/zero-touch/provision/:routerID
 *
 * A router that is still PENDING must receive the wait-and-poll script and
 * the DB must stay untouched; a router the owner APPROVED (setup_status =
 * 'configuring') must receive the full provisioning script and be promoted
 * to 'configured'. This is the endpoint that decides whether the physical
 * router ever gets its WireGuard interface.
 */

process.env.ROUTER_REGISTRATION_SECRET = 'test-registration-secret';
process.env.PUBLIC_BASE_URL = 'https://example.test';
process.env.SERVER_PUBLIC_HOST = 'hotbandowifi.online';
process.env.WG_SERVER_PUBLIC_KEY = 'SERVERPUBKEY4444';
process.env.WG_PORT = '443';

const express = require('express');
const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');

// provisionRouter() re-publishes the peer descriptor; keep it in a temp dir
// instead of the container/host default path.
const peersDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hotbando-poll-'));
process.env.WG_PEERS_DIR = peersDir;

jest.mock('../config/database', () => ({ execute: jest.fn(), query: jest.fn() }));
jest.mock('../utils/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));
jest.mock('../utils/encryption', () => ({
    encrypt: (v) => `enc:${v}`,
    decrypt: (v) => v,
    isEncrypted: () => false
}));
jest.mock('../utils/mikrotik', () => ({
    getRouterConnection: jest.fn(),
    fetchAndImportScript: jest.fn()
}));

const db = require('../config/database');
const zeroTouchRouter = require('../routes/zeroTouch');

const ROUTER_ID = 'HB-D5AD0DD733CD';
const SECRET = 'test-registration-secret';
const state = { row: null };

function row(overrides = {}) {
    return {
        id: 1,
        router_id: ROUTER_ID,
        router_name: 'Gate 1',
        host: '10.7.0.2',
        port: 8728,
        user: 'admin',
        password: 'enc:admin',
        ssid: 'HotBando-Free-WiFi',
        status: 'offline',
        setup_status: 'configuring',
        wireguard_ip: '10.7.0.2',
        wireguard_public_key: 'ROUTERPUBKEY',
        wireguard_private_key: 'ROUTERPRIVATEKEY',
        wireguard_preshared_key: 'ROUTERPSK',
        wireguard_configured: 1,
        ...overrides
    };
}

const app = express();
app.use(express.json());
app.use('/api/zero-touch', zeroTouchRouter);

beforeEach(() => {
    state.row = row();
    db.execute.mockImplementation(async (sql) => {
        if (/SELECT \* FROM mikrotiks WHERE router_id = \?/.test(sql)) {
            return [[{ ...state.row }], []];
        }
        return [{ affectedRows: 0, insertId: 0 }, []];
    });
});

function writes() {
    return db.execute.mock.calls
        .map(([sql]) => sql)
        .filter(sql => /^\s*UPDATE mikrotiks/i.test(sql));
}

afterAll(() => {
    try { fs.rmSync(peersDir, { recursive: true, force: true }); } catch (e) { /* best effort */ }
});

describe('provision poll delivery', () => {
    test('pending router gets the wait-and-poll script and no state change', async () => {
        state.row.setup_status = 'pending';

        const res = await request(app)
            .get(`/api/zero-touch/provision/${ROUTER_ID}?secret=${SECRET}`);

        expect(res.status).toBe(200);
        expect(res.headers['x-hotbando-status']).toBe('pending');
        expect(res.text).toContain('hotbando-poll');
        expect(res.text).toContain('awaiting CONNECT approval');
        expect(res.text).not.toContain('wg-hotbando');
        expect(writes()).toHaveLength(0);
    });

    test('approved (configuring) router gets the FULL script and is promoted', async () => {
        state.row.setup_status = 'configuring';

        const res = await request(app)
            .get(`/api/zero-touch/provision/${ROUTER_ID}?secret=${SECRET}`);

        expect(res.status).toBe(200);
        expect(res.headers['x-hotbando-status']).toBe('ready');
        expect(res.text).toContain('/interface wireguard add name="wg-hotbando"');
        expect(res.text).toContain('endpoint-port=443');
        expect(res.text).toContain('SERVERPUBKEY4444');
        expect(res.text).toContain('address=10.7.0.2/32');
        // Provisioning delivery must record that the router is configured.
        const promotion = writes().find(sql => /setup_status = 'configured'/.test(sql));
        expect(promotion).toBeDefined();
        expect(promotion).toMatch(/wireguard_configured = 1/);
    });

    test('already-configured router is still served (re-pull after factory reset)', async () => {
        state.row.setup_status = 'configured';

        const res = await request(app)
            .get(`/api/zero-touch/provision/${ROUTER_ID}?secret=${SECRET}`);

        expect(res.status).toBe(200);
        expect(res.headers['x-hotbando-status']).toBe('ready');
        expect(res.text).toContain('/interface wireguard add name="wg-hotbando"');
    });

    test('wrong secret is rejected without touching the DB', async () => {
        const res = await request(app)
            .get(`/api/zero-touch/provision/${ROUTER_ID}?secret=wrong`);

        expect(res.status).toBe(401);
        expect(res.text || '').not.toContain('wg-hotbando');
        expect(db.execute).not.toHaveBeenCalled();
    });

    test('a rejected poll is logged so a stale secret is diagnosable (no secret leaked)', async () => {
        const logger = require('../utils/logger');
        logger.warn.mockClear();

        await request(app)
            .get(`/api/zero-touch/provision/${ROUTER_ID}?secret=stale-value`)
            .expect(401);

        expect(logger.warn).toHaveBeenCalled();
        const logged = JSON.stringify(logger.warn.mock.calls);
        expect(logged).toContain('invalid registration secret');
        expect(logged).toContain(ROUTER_ID);
        // Neither the presented nor the configured secret may ever be logged.
        expect(logged).not.toContain('stale-value');
        expect(logged).not.toContain(SECRET);
    });

    test('delivery of the FULL script is logged (id only, never the script)', async () => {
        const logger = require('../utils/logger');
        logger.info.mockClear();

        const res = await request(app)
            .get(`/api/zero-touch/provision/${ROUTER_ID}?secret=${SECRET}`);

        expect(res.status).toBe(200);
        expect(logger.info).toHaveBeenCalled();
        const logged = JSON.stringify(logger.info.mock.calls);
        expect(logged).toContain('Provisioning script delivered');
        expect(logged).toContain(ROUTER_ID);
        expect(logged).not.toContain('wg-hotbando');
        expect(logged).not.toContain('ROUTERPRIVATEKEY');
    });
});
