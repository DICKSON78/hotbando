/**
 * Endpoint port wiring: the RouterOS script must advertise exactly the port
 * the host wg0 actually listens on (production runs 443, the code default is
 * 51820 — a divergence silently produces a tunnel that can never handshake).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('../config/database', () => ({ execute: jest.fn(), query: jest.fn() }));
jest.mock('../utils/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));
jest.mock('../utils/encryption', () => ({
    encrypt: (v) => `enc:${v}`,
    decrypt: (v) => v,
    isEncrypted: () => false
}));

function loadWithWgPort(value) {
    if (value === undefined) delete process.env.WG_PORT;
    else process.env.WG_PORT = value;
    jest.resetModules();
    return {
        wireguard: require('../utils/wireguard'),
        routerProvision: require('../utils/routerProvision')
    };
}

function generateScript(routerProvision) {
    return routerProvision.generateProvisionScript({
        router: { router_name: 'Gate 1', ssid: 'HotBando-Free-WiFi' },
        routerID: 'HB-D5AD0DD733CD',
        assignedIp: '10.7.0.2',
        wireguard: {
            routerPublicKey: 'ROUTERPUBKEY',
            routerPrivateKey: 'ROUTERPRIVATEKEY',
            serverPublicKey: 'SERVERPUBKEY4444',
            presharedKey: ''
        }
    });
}

afterAll(() => {
    delete process.env.WG_PORT;
});

describe('endpoint port follows WG_PORT', () => {
    test('WG_PORT=443 (production) produces endpoint-port=443', () => {
        process.env.WG_SERVER_PUBLIC_KEY = 'SERVERPUBKEY4444';
        const { wireguard, routerProvision } = loadWithWgPort('443');

        expect(wireguard.listenPort).toBe(443);
        const script = generateScript(routerProvision);
        expect(script).toContain('endpoint-port=443');
        expect(script).not.toContain('endpoint-port=51820');
    });

    test('unset WG_PORT falls back to the documented 51820 default', () => {
        process.env.WG_SERVER_PUBLIC_KEY = 'SERVERPUBKEY4444';
        const { wireguard, routerProvision } = loadWithWgPort(undefined);

        expect(wireguard.listenPort).toBe(51820);
        expect(generateScript(routerProvision)).toContain('endpoint-port=51820');
    });

    test('a malformed WG_PORT never yields NaN in the router script', () => {
        process.env.WG_SERVER_PUBLIC_KEY = 'SERVERPUBKEY4444';
        const { wireguard, routerProvision } = loadWithWgPort('not-a-port');

        expect(wireguard.listenPort).toBe(51820);
        expect(generateScript(routerProvision)).not.toContain('endpoint-port=NaN');
    });
});

describe('host listen port reported by the watcher', () => {
    let statusDir;

    beforeAll(() => {
        statusDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hotbando-status-'));
    });

    afterAll(() => {
        try { fs.rmSync(statusDir, { recursive: true, force: true }); } catch (e) { /* best effort */ }
    });

    test('a mismatch between WG_PORT and the live wg0 port is surfaced', async () => {
        process.env.WG_STATUS_FILE = path.join(statusDir, 'wg-status-result');
        fs.writeFileSync(process.env.WG_STATUS_FILE, JSON.stringify({
            running: true, listenPort: 443, wgPeers: 1, activePeers: 0, updatedAt: 1
        }));

        const { wireguard } = loadWithWgPort('51820');
        // resetModules() reloads the mocked logger too — grab the live instance.
        const liveLogger = require('../utils/logger');
        const status = await wireguard.getServerStatus();

        // The live host value wins so the dashboard cannot show a stale port…
        expect(status.listenPort).toBe(443);
        // …and the divergence is logged instead of passing silently.
        expect(liveLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining('listen port')
        );

        delete process.env.WG_STATUS_FILE;
    });
});
