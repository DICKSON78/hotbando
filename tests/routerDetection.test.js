// Regression tests for router detection: a real RouterOS box must stay
// visible even when the default credentials are wrong, and registered
// routers behind the WireGuard tunnel must appear in scan results.

jest.mock('../config/database', () => ({
    execute: jest.fn(async () => [[]]),
    query: jest.fn(async () => [[]])
}));

const db = require('../config/database');
const detector = require('../utils/mikrotikDetector');

afterEach(() => {
    jest.restoreAllMocks();
    db.execute.mockReset();
    db.execute.mockResolvedValue([[]]);
});

describe('probeMikrotik', () => {
    test('finds working credentials on api-ssl (8729)', async () => {
        jest.spyOn(detector, 'verifyMikrotik').mockImplementation(async (ip, port, user, password) => {
            if (port === 8729 && password === 'admin') {
                return { isMikrotik: true, identity: 'Site-A', model: 'hAP', firmware: '7.15' };
            }
            return { isMikrotik: true, authFailed: true };
        });

        const result = await detector.probeMikrotik('10.7.0.9', 'admin', '');

        expect(result.isMikrotik).toBe(true);
        expect(result.authFailed).toBeUndefined();
        expect(result.port).toBe(8729);
        expect(result.credentialsFound).toBe(true);
        expect(result.identity).toBe('Site-A');
        expect(result.password).toBeUndefined();
    });

    test('reports an auth failure instead of "not a MikroTik"', async () => {
        jest.spyOn(detector, 'verifyMikrotik').mockResolvedValue({ isMikrotik: true, authFailed: true });

        const result = await detector.probeMikrotik('192.168.88.1');

        expect(result.isMikrotik).toBe(true);
        expect(result.authFailed).toBe(true);
        expect(result.portsTried).toEqual([8728, 8729]);
    });
});

describe('enrichDeviceInfo', () => {
    test('keeps an auth-failed router with needsCredentials', async () => {
        jest.spyOn(detector, 'probeMikrotik').mockResolvedValue({ isMikrotik: true, authFailed: true });

        const devices = await detector.enrichDeviceInfo([
            { ip: '192.168.88.1', mac: '4c:5e:0c:00:00:01', source: 'arp', confidence: 'low', isMikrotik: false }
        ]);

        expect(devices).toHaveLength(1);
        expect(devices[0].isMikrotik).toBe(true);
        expect(devices[0].needsCredentials).toBe(true);
    });

    test('drops devices that are not RouterOS', async () => {
        jest.spyOn(detector, 'probeMikrotik').mockResolvedValue({ isMikrotik: false });

        const devices = await detector.enrichDeviceInfo([
            { ip: '192.168.88.20', source: 'port-scan', confidence: 'high', isMikrotik: false }
        ]);

        expect(devices).toEqual([]);
    });
});

describe('getTunnelDevices', () => {
    test('lists registered tunnel routers even when the API port is closed', async () => {
        db.execute.mockResolvedValueOnce([[
            { router_id: 'RT-001', router_name: 'Site A', wireguard_ip: '10.7.0.9', model: 'hAP', firmware_version: '7.15' }
        ]]);
        jest.spyOn(detector, 'tcpOpen').mockResolvedValue(false);

        const devices = await detector.getTunnelDevices();

        expect(devices).toHaveLength(1);
        expect(devices[0]).toEqual(expect.objectContaining({
            ip: '10.7.0.9',
            source: 'tunnel',
            identity: 'Site A',
            inDatabase: true,
            isMikrotik: false
        }));
    });
});
