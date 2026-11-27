process.env.ROUTER_REGISTRATION_SECRET = 'test-registration-secret';

const express = require('express');
const request = require('supertest');

// All external dependencies are mocked. No DB socket, no router, no key files.
jest.mock('../config/database', () => ({
    execute: jest.fn(async () => [[]]),
    query: jest.fn(async () => [[]])
}));

jest.mock('../utils/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));

jest.mock('../utils/mikrotik', () => ({
    getRouterConnection: jest.fn(),
    fetchAndImportScript: jest.fn()
}));

const mockRegisterRouter = jest.fn();
const mockConnectRouter = jest.fn();
const mockProvisionRouter = jest.fn();

jest.mock('../utils/routerProvision', () => ({
    registerRouter: (...args) => mockRegisterRouter(...args),
    connectRouter: (...args) => mockConnectRouter(...args),
    provisionRouter: (...args) => mockProvisionRouter(...args),
    generateBootstrapScript: () => '# bootstrap',
    ROUTER_REGISTRATION_SECRET: 'test-registration-secret'
}));

const { RouterIdentityConflictError } = require('../utils/routerIdentity');
const zeroTouchRouter = require('../routes/zeroTouch');

const app = express();
app.use(express.json());
app.use('/api/zero-touch', zeroTouchRouter);

const existingRouter = {
    router_id: 'RT-001', router_name: 'Site A', wireguard_ip: '10.7.0.9',
    setup_status: 'pending', ssid: 'HotBando-Free-WiFi'
};

beforeEach(() => {
    jest.clearAllMocks();
    mockRegisterRouter.mockResolvedValue({
        router: existingRouter, assignedIp: '10.7.0.9', pending: true,
        script: '# wait-and-poll script'
    });
    mockConnectRouter.mockResolvedValue({
        router: { ...existingRouter, setup_status: 'configuring' },
        routerId: 'RT-001', assignedIp: '10.7.0.9',
        script: '# full provisioning script'
    });
    mockProvisionRouter.mockResolvedValue({
        router: existingRouter, assignedIp: '10.7.0.9', pending: true,
        script: '# wait-and-poll script'
    });
});

describe('zero-touch registration endpoints (mocked)', () => {
    test('normal registration returns the wait script and does not auto-connect', async () => {
        const response = await request(app)
            .post('/api/zero-touch/register')
            .send({ secret: 'test-registration-secret', serial: 'S-001', router_id: 'RT-001' });

        expect(response.status).toBe(200);
        expect(response.text).toContain('wait-and-poll');
        expect(response.headers['x-hotbando-status']).toBe('pending');
        expect(mockConnectRouter).not.toHaveBeenCalled();
        expect(mockRegisterRouter).toHaveBeenCalledWith(expect.objectContaining({
            serial: 'S-001', routerId: 'RT-001'
        }));
    });

    test('auto_connect=1 is ignored: registration stays pending and never connects automatically', async () => {
        const response = await request(app)
            .post('/api/zero-touch/register?auto_connect=1')
            .send({ secret: 'test-registration-secret', serial: 'S-001', router_id: 'RT-001' });

        expect(response.status).toBe(200);
        // Wait script, not the full provisioning script.
        expect(response.text).toContain('wait-and-poll');
        expect(response.text).not.toContain('full provisioning');
        expect(response.headers['x-hotbando-status']).toBe('pending');
        // The bypass is gone: registration must NEVER call connectRouter().
        expect(mockConnectRouter).not.toHaveBeenCalled();
        expect(mockRegisterRouter).toHaveBeenCalledTimes(1);
    });

    test('auto_connect via JSON body is also ignored', async () => {
        const response = await request(app)
            .post('/api/zero-touch/register')
            .send({ secret: 'test-registration-secret', serial: 'S-001', router_id: 'RT-001', auto_connect: true });

        expect(response.status).toBe(200);
        expect(response.headers['x-hotbando-status']).toBe('pending');
        expect(mockConnectRouter).not.toHaveBeenCalled();
    });

    test('the secret-bearing /bootstrap endpoint is not exposed publicly', async () => {
        const response = await request(app).get('/api/zero-touch/bootstrap');
        // Route removed entirely: no script and no registration secret is served.
        expect(response.status).toBe(404);
        expect(response.text || '').not.toContain('test-registration-secret');
        expect(response.text || '').not.toContain('hotbandoSecret');
    });

    test('invalid secret is rejected before any registration logic', async () => {
        const response = await request(app)
            .post('/api/zero-touch/register')
            .send({ secret: 'wrong', serial: 'S-001' });
        expect(response.status).toBe(401);
        expect(mockRegisterRouter).not.toHaveBeenCalled();
    });

    test('conflicting identities produce HTTP 409 without creating a router', async () => {
        mockRegisterRouter.mockRejectedValueOnce(new RouterIdentityConflictError(
            'router_id and serial_number do not identify the same router', { ids: [1, 2] }
        ));
        const response = await request(app)
            .post('/api/zero-touch/register')
            .send({ secret: 'test-registration-secret', router_id: 'RT-A', serial: 'S-B' });
        expect(response.status).toBe(409);
        expect(response.body).toEqual(expect.objectContaining({ success: false }));
        expect(mockConnectRouter).not.toHaveBeenCalled();
    });

    test('GET provision serves wait script while pending (no write through this route)', async () => {
        const response = await request(app)
            .get('/api/zero-touch/provision/RT-001?secret=test-registration-secret');
        expect(response.status).toBe(200);
        expect(response.headers['x-hotbando-status']).toBe('pending');
        expect(mockProvisionRouter).toHaveBeenCalledWith({ routerId: 'RT-001' });
    });

    test('heartbeat reports needsConfig for a pending router', async () => {
        const db = require('../config/database');
        db.execute.mockImplementationOnce(async () => [[]]) // UPDATE
            .mockImplementationOnce(async () => [[{ setup_status: 'pending', ssid: null, wireguard_ip: '10.7.0.9' }]]);
        const response = await request(app)
            .post('/api/zero-touch/heartbeat')
            .send({ secret: 'test-registration-secret', router_id: 'RT-001' });
        expect(response.status).toBe(200);
        expect(response.body.needsConfig).toBe(true);
    });
});
