/**
 * Approval -> peer publication -> provisioning script.
 *
 * The owner clicking CONNECT must, by itself, make the router eligible for
 * peer sync (wireguard_configured = 1 + setup_status = 'configuring'), publish
 * the descriptor into the shared directory that the host watcher reads, and
 * hand the router a script built from the LIVE server configuration
 * (WG_PORT, WG_SERVER_PUBLIC_KEY) without logging any secret.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const sharedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hotbando-approve-'));
process.env.WG_PEERS_DIR = sharedDir;
process.env.WG_SERVER_PUBLIC_KEY = 'SERVERPUBKEY4444';
process.env.WG_PORT = '443';
process.env.ROUTER_REGISTRATION_SECRET = 'test-registration-secret';
process.env.PUBLIC_BASE_URL = 'https://example.test';
process.env.SERVER_PUBLIC_HOST = 'hotbandowifi.online';
process.env.RADIUS_SECRET = 'radius-secret-value';
delete process.env.MIKROTIK_API_PASSWORD;

jest.mock('../config/database', () => ({ execute: jest.fn(), query: jest.fn() }));
jest.mock('../utils/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));
jest.mock('../utils/encryption', () => ({
    encrypt: (v) => `enc:${v}`,
    decrypt: (v) => v,
    isEncrypted: () => false
}));

const db = require('../config/database');
const logger = require('../utils/logger');
const routerProvision = require('../utils/routerProvision');
const wireguard = require('../utils/wireguard');

const ROUTER_ID = 'HB-D5AD0DD733CD';

const state = { row: null };

function baseRow(overrides = {}) {
    return {
        id: 1,
        router_id: ROUTER_ID,
        router_name: 'Gate 1',
        host: '',
        port: 8728,
        user: 'admin',
        password: 'enc:admin',
        ssid: 'HotBando-Free-WiFi',
        status: 'offline',
        setup_status: 'pending',
        setup_step: 1,
        wireguard_ip: '10.7.0.2',
        wireguard_public_key: 'ROUTERPUBKEY',
        wireguard_private_key: 'ROUTERPRIVATEKEY',
        wireguard_preshared_key: 'ROUTERPSK',
        wireguard_configured: 0,
        ...overrides
    };
}

beforeEach(() => {
    for (const name of fs.readdirSync(sharedDir)) {
        fs.unlinkSync(path.join(sharedDir, name));
    }
    state.row = baseRow();
    db.execute.mockImplementation(async (sql) => {
        if (/SELECT \* FROM mikrotiks WHERE router_id = \?/.test(sql)) {
            return [[{ ...state.row }], []];
        }
        if (/SELECT router_id, router_name, wireguard_ip/.test(sql)) {
            const approved = [state.row].filter(r =>
                ['configuring', 'configured'].includes(r.setup_status) &&
                r.wireguard_ip && r.wireguard_public_key);
            return [approved, []];
        }
        return [{ affectedRows: 0, insertId: 0 }, []];
    });
});

afterAll(() => {
    try { fs.rmSync(sharedDir, { recursive: true, force: true }); } catch (e) { /* best effort */ }
});

function updateCalls() {
    return db.execute.mock.calls
        .map(([sql]) => sql)
        .filter(sql => /^\s*UPDATE mikrotiks/i.test(sql));
}

describe('connectRouter (owner approval)', () => {
    test('marks the router approved AND publishable in a single UPDATE', async () => {
        const result = await routerProvision.connectRouter(ROUTER_ID);

        const updates = updateCalls();
        expect(updates.length).toBeGreaterThan(0);
        const approvalUpdate = updates.find(sql => /setup_status = 'configuring'/.test(sql));
        expect(approvalUpdate).toBeDefined();
        // Without this flag the row was invisible to syncPeerFilesFromDb().
        expect(approvalUpdate).toMatch(/wireguard_configured = 1/);
        expect(approvalUpdate).toMatch(/host = \?/);
        expect(result.status).toBe('configuring');
        expect(result.assignedIp).toBe('10.7.0.2');
    });

    test('publishes the router descriptor + .apply into the shared watcher directory', async () => {
        await routerProvision.connectRouter(ROUTER_ID);

        const descriptor = path.join(sharedDir, '10.7.0.2.peer');
        expect(fs.existsSync(descriptor)).toBe(true);
        const [routerId, ip, publicKey] = fs.readFileSync(descriptor, 'utf8').trim().split('\t');
        expect(routerId).toBe(ROUTER_ID);
        expect(ip).toBe('10.7.0.2');
        expect(publicKey).toBe('ROUTERPUBKEY');
        expect(fs.existsSync(path.join(sharedDir, '.apply'))).toBe(true);
    });

    test('the descriptor survives a later resync (approval is the source of truth)', async () => {
        await routerProvision.connectRouter(ROUTER_ID);
        expect(fs.existsSync(path.join(sharedDir, '10.7.0.2.peer'))).toBe(true);

        // Simulate the post-approval state: the flag may still be 0 in old rows.
        state.row.setup_status = 'configuring';
        state.row.wireguard_configured = 0;
        await wireguard.syncPeerFilesFromDb();

        expect(fs.existsSync(path.join(sharedDir, '10.7.0.2.peer'))).toBe(true);
    });

    test('is idempotent: connecting an already-configuring router does not regenerate keys', async () => {
        state.row.setup_status = 'configuring';
        const before = state.row.wireguard_public_key;

        const result = await routerProvision.connectRouter(ROUTER_ID);

        expect(result.status).toBe('configuring');
        expect(state.row.wireguard_public_key).toBe(before);
        expect(fs.readdirSync(sharedDir).filter(n => n.endsWith('.peer'))).toEqual(['10.7.0.2.peer']);
    });

    test('rejects a router that is not awaiting approval', async () => {
        state.row.setup_status = 'configured';
        await expect(routerProvision.connectRouter(ROUTER_ID))
            .rejects.toThrow(/not awaiting approval/);
        expect(updateCalls()).toHaveLength(0);
    });
});

describe('generated provisioning script (live configuration)', () => {
    test('uses the live WG port (443), server public key and router tunnel IP', async () => {
        const result = await routerProvision.connectRouter(ROUTER_ID);
        const script = result.script;

        // Endpoint port must come from WG_PORT, never the 51820 default.
        expect(process.env.WG_PORT).toBe('443');
        expect(script).toContain('endpoint-port=443');
        expect(script).not.toContain('endpoint-port=51820');

        // Server identity + router identity.
        expect(script).toContain('SERVERPUBKEY4444');
        expect(script).toContain('endpoint-address=hotbandowifi.online');
        expect(script).toContain('address=10.7.0.2/32');
        expect(script).toContain('allowed-address=10.7.0.1/32');
        expect(script).toContain('dst-address=10.7.0.1/32');

        // Approval state is reflected in the DB row handed back.
        expect(result.serverPublicKey).toBe('SERVERPUBKEY4444');
        expect(result.wgPort).toBe(443);
    });

    test('never writes keys or secrets to the log', async () => {
        const result = await routerProvision.connectRouter(ROUTER_ID);

        const logged = JSON.stringify([
            ...logger.info.mock.calls,
            ...logger.warn.mock.calls,
            ...logger.error.mock.calls,
            ...logger.debug.mock.calls
        ]);
        expect(logged).not.toContain('ROUTERPRIVATEKEY');
        expect(logged).not.toContain('ROUTERPSK');
        expect(logged).not.toContain('radius-secret-value');
        // The script itself must carry the router private key (it configures
        // the router) — but only the script, never a log line.
        expect(result.script).toContain('ROUTERPRIVATEKEY');
    });

    test('the provision script is safe to re-run: destructive removes are scoped', async () => {
        const { script } = await routerProvision.connectRouter(ROUTER_ID);

        // Never wipe a pre-existing site hotspot / RADIUS configuration.
        expect(script).not.toMatch(/\/ip hotspot remove \[find\]/);
        expect(script).not.toMatch(/\/radius remove \[find service=hotspot\]/);
        // A missing login.html must not abort the import.
        expect(script).toContain(':do { /file remove hotspot/login.html } on-error={}');
        // Our own objects are still removed/recreated (idempotency).
        expect(script).toContain('/ip hotspot remove [find name="hotbando-server"]');
        expect(script).toContain('/interface wireguard remove [find name="wg-hotbando"]');
    });
});
