/**
 * Peer-descriptor hand-off contract: app container -> shared directory ->
 * host watcher (scripts/hotbando-wg-apply).
 *
 * Regression for the production outage where the app container had NO
 * /host-wireguard-peers bind mount, so descriptors and the .apply trigger
 * were written to a container-private /etc/wireguard/hotbando-peers and the
 * host watcher never saw them (wg0 peer never updated, tunnel never came up).
 *
 * Also covers the approval/sync consistency bug: syncPeerFilesFromDb() used
 * to require wireguard_configured = 1, a flag the approval path never set,
 * and then REAPED the descriptor of an approved router.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

// Must be set BEFORE ../utils/wireguard is loaded: the module resolves the
// peers directory once, at require time.
const sharedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hotbando-peers-'));
process.env.WG_PEERS_DIR = sharedDir;
process.env.WG_SERVER_PUBLIC_KEY = 'SERVERPUBKEY';

jest.mock('../config/database', () => ({ execute: jest.fn(), query: jest.fn() }));
jest.mock('../utils/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));

const db = require('../config/database');
const logger = require('../utils/logger');
const wireguard = require('../utils/wireguard');

const approvedRow = (overrides = {}) => ({
    router_id: 'HB-D5AD0DD733CD',
    router_name: 'Gate',
    wireguard_ip: '10.7.0.2',
    wireguard_public_key: 'ROUTERPUBKEY',
    wireguard_preshared_key: '',
    wireguard_configured: 1,
    setup_status: 'configuring',
    ...overrides
});

function peerPath(ip) {
    return path.join(sharedDir, `${ip}.peer`);
}

function writeDescriptor(routerId, ip) {
    fs.writeFileSync(peerPath(ip), `${routerId}\t${ip}\tPUBKEY\t\n`, 'utf8');
}

beforeEach(() => {
    for (const name of fs.readdirSync(sharedDir)) {
        fs.unlinkSync(path.join(sharedDir, name));
    }
});

afterAll(() => {
    try { fs.rmSync(sharedDir, { recursive: true, force: true }); } catch (e) { /* best effort */ }
});

describe('shared peer directory configuration', () => {
    test('WG_PEERS_DIR is used for descriptors, not a container-private fallback', () => {
        expect(wireguard.peerFilePath('10.7.0.2')).toBe(peerPath('10.7.0.2'));
        // The path must not silently degrade to the container-local default.
        expect(wireguard.peerFilePath('10.7.0.2')).not.toContain(path.join('etc', 'wireguard', 'hotbando-peers'));
    });

    test('writePeerFile and the .apply trigger land in the SAME shared directory', () => {
        const written = wireguard.writePeerFile({
            routerId: 'HB-D5AD0DD733CD',
            publicKey: 'ROUTERPUBKEY',
            ip: '10.7.0.2',
            presharedKey: ''
        });
        expect(written).toBe(true);
        expect(wireguard.triggerApply()).toBe(true);

        expect(fs.existsSync(peerPath('10.7.0.2'))).toBe(true);
        expect(fs.existsSync(path.join(sharedDir, '.apply'))).toBe(true);

        const [routerId, ip, publicKey] = fs.readFileSync(peerPath('10.7.0.2'), 'utf8').trim().split('\t');
        expect(routerId).toBe('HB-D5AD0DD733CD');
        expect(ip).toBe('10.7.0.2');
        expect(publicKey).toBe('ROUTERPUBKEY');
    });

    test('peerFilePath only allows a dotted-quad filename', () => {
        expect(path.basename(wireguard.peerFilePath('10.7.0.2; rm -rf /'))).toBe('10.7.0.2.peer');
    });
});

describe('syncPeerFilesFromDb', () => {
    test('publishes an approved router even when wireguard_configured is 0', async () => {
        // The approval path (connectRouter) historically never set this flag.
        const row = approvedRow({ wireguard_configured: 0 });
        let seenSql = '';
        db.execute.mockImplementation(async (sql) => {
            if (/SELECT router_id, router_name, wireguard_ip/.test(sql)) {
                seenSql = sql;
                const approved = [row].filter(r =>
                    ['configuring', 'configured'].includes(r.setup_status) &&
                    r.wireguard_ip && r.wireguard_public_key);
                return [approved, []];
            }
            return [[], []];
        });

        const ok = await wireguard.syncPeerFilesFromDb();

        // Approval (setup_status) is the filter; the never-set reporting flag
        // must not gate publication any more.
        expect(seenSql).toMatch(/setup_status IN \('configuring', 'configured'\)/);
        expect(seenSql).not.toMatch(/wireguard_configured\s*=\s*1/);
        expect(ok).toBe(true);
        expect(fs.existsSync(peerPath('10.7.0.2'))).toBe(true);
        expect(fs.readFileSync(peerPath('10.7.0.2'), 'utf8')).toContain('HB-D5AD0DD733CD');
    });

    test('reaps the descriptor of a router that is not approved (still pending)', async () => {
        writeDescriptor('HB-STILL-PENDING', '10.7.0.9');
        writeDescriptor('HB-APPROVED', '10.7.0.5');

        db.execute.mockImplementation(async (sql) => {
            if (/SELECT router_id, router_name, wireguard_ip/.test(sql)) {
                return [[approvedRow({
                    router_id: 'HB-APPROVED',
                    wireguard_ip: '10.7.0.5',
                    wireguard_public_key: 'OTHERPUBKEY',
                    setup_status: 'configured'
                })], []];
            }
            return [[], []];
        });

        await wireguard.syncPeerFilesFromDb();
        expect(fs.existsSync(peerPath('10.7.0.9'))).toBe(false);
        expect(fs.existsSync(peerPath('10.7.0.5'))).toBe(true);
    });

    test('is idempotent: repeated syncs keep exactly one descriptor per router', async () => {
        db.execute.mockImplementation(async (sql) => {
            if (/SELECT router_id, router_name, wireguard_ip/.test(sql)) return [[approvedRow()], []];
            return [[], []];
        });

        await wireguard.syncPeerFilesFromDb();
        await wireguard.syncPeerFilesFromDb();

        const descriptors = fs.readdirSync(sharedDir).filter(n => n.endsWith('.peer'));
        expect(descriptors).toEqual(['10.7.0.2.peer']);
    });

    test('never removes a descriptor when the DB read fails (fail closed, no reap)', async () => {
        writeDescriptor('HB-APPROVED', '10.7.0.5');
        db.execute.mockImplementation(async () => { throw new Error('db down'); });

        const ok = await wireguard.syncPeerFilesFromDb();
        expect(ok).toBe(false);
        expect(fs.existsSync(peerPath('10.7.0.5'))).toBe(true);
        expect(logger.warn).toHaveBeenCalled();
    });
});
