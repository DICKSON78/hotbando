const {
    planNextIp,
    allocateWireGuardIp,
    parseNetwork,
    isIPv4,
    resetAllocationState,
    releaseAllocation,
    markAllocated
} = require('../utils/wireguardAllocation');
const { createMockDb, assertReadOnly } = require('./helpers/mockDb');

const expectErrorCode = (fn, code) => {
    try {
        fn();
    } catch (error) {
        expect(error.code).toBe(code);
        return;
    }
    throw new Error(`Expected an error with code ${code}`);
};

const fakeFs = (files = {}, status = null) => ({
    readdirSync: () => Object.keys(files).map(p => p.split('/').pop()),
    readFileSync: (p) => {
        if (status && String(p).includes('status')) return JSON.stringify(status);
        return files[String(p)] || '';
    }
});

beforeEach(() => resetAllocationState());

describe('WireGuard address planning (pure)', () => {
    test('first free address in the configured network', () => {
        expect(planNextIp({ usedIps: [] })).toBe('10.7.0.2');
    });

    test('skips allocated, server, reserved and malformed addresses', () => {
        const ip = planNextIp({
            usedIps: ['10.7.0.2', 'not-an-ip', '10.7.0.3'],
            reservedIps: ['10.7.0.4'],
            serverIp: '10.7.0.1'
        });
        expect(ip).toBe('10.7.0.5');
    });

    test('honours a non-default network CIDR', () => {
        expect(planNextIp({ network: '10.9.8.0/30', serverIp: '10.9.8.1', usedIps: [] })).toBe('10.9.8.2');
    });

    test('throws a meaningful error when the pool is exhausted', () => {
        expectErrorCode(() => planNextIp({
            network: '10.9.8.0/30',
            serverIp: '10.9.8.1',
            usedIps: ['10.9.8.2']
        }), 'NO_AVAILABLE_IP');
    });

    test('rejects invalid networks/servers/addresses', () => {
        expectErrorCode(() => parseNetwork('garbage'), 'INVALID_NETWORK');
        expectErrorCode(() => planNextIp({ network: '10.7.0.0/16', serverIp: 'bad' }), 'INVALID_SERVER_IP');
        expect(isIPv4('10.7.0.999')).toBe(false);
    });

    test('pending allocations are not handed out twice; release/mark free them', async () => {
        const now = 1_000_000;
        const db = createMockDb({ mikrotiks: [] });
        const options = { db, fs: fakeFs(), peersDir: '/peers', statusFile: '/status', now };
        expect(await allocateWireGuardIp(options)).toBe('10.7.0.2');
        expect(await allocateWireGuardIp(options)).toBe('10.7.0.3');
        releaseAllocation('10.7.0.2'); // simulate a failed registration
        expect(await allocateWireGuardIp(options)).toBe('10.7.0.2');
        markAllocated('10.7.0.2');     // simulate a committed DB row
        expect(planNextIp({ usedIps: ['10.7.0.2', '10.7.0.3'], now })).toBe('10.7.0.4');
        // Pending entries expire, so a stale reservation cannot block forever.
        resetAllocationState();
        await allocateWireGuardIp(options);
        expect(planNextIp({ usedIps: [], now: now + 120_000 })).toBe('10.7.0.2');
    });
});

describe('allocateWireGuardIp — read-only allocation with injected dependencies', () => {
    test('uses database allocations only, without writing', async () => {
        const db = createMockDb({ mikrotiks: [{ wireguard_ip: '10.7.0.2' }] });
        const ip = await allocateWireGuardIp({ db, fs: fakeFs(), peersDir: '/peers', statusFile: '/status' });
        expect(ip).toBe('10.7.0.3');
        assertReadOnly(db);
    });

    test('considers existing WireGuard peer descriptors and host status', async () => {
        const db = createMockDb({ mikrotiks: [] });
        const fs = fakeFs({ '/peers/10.7.0.2.peer': 'x' }, { allowedIps: ['10.7.0.3'] });
        const ip = await allocateWireGuardIp({ db, fs, peersDir: '/peers', statusFile: '/status' });
        expect(ip).toBe('10.7.0.4');
    });

    test('never falls back to 10.7.0.2 when the DB read fails', async () => {
        const db = { execute: async () => { throw new Error('connection lost'); } };
        await expect(allocateWireGuardIp({ db, fs: fakeFs() }))
            .rejects.toMatchObject({ code: 'DB_UNAVAILABLE' });
    });

    test('concurrent requests receive different addresses', async () => {
        const db = createMockDb({ mikrotiks: [] });
        const options = { db, fs: fakeFs(), peersDir: '/peers', statusFile: '/status' };
        const [a, b, c] = await Promise.all([
            allocateWireGuardIp(options),
            allocateWireGuardIp(options),
            allocateWireGuardIp(options)
        ]);
        expect(new Set([a, b, c]).size).toBe(3);
        assertReadOnly(db);
    });

    test('invalid peer-file names cannot become allocated addresses', async () => {
        const db = createMockDb({ mikrotiks: [] });
        const fs = fakeFs({ '/peers/not_an_ip.peer': 'x' });
        const ip = await allocateWireGuardIp({ db, fs, peersDir: '/peers' });
        expect(isIPv4(ip)).toBe(true);
        expect(ip).toBe('10.7.0.2');
    });
});
