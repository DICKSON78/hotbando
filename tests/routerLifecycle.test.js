const {
    deriveOperationalState,
    canPromoteToOnline,
    isFreshHeartbeat,
    isFreshHandshake,
    toDatabaseState,
    toEpochMs
} = require('../utils/routerLifecycle');

const NOW = Date.parse('2026-11-25T12:00:00Z');
const fresh = new Date(NOW - 60_000).toISOString();
const stale = new Date(NOW - 30 * 60_000).toISOString();
const handshake = (NOW - 30_000) / 1000;
const oldHandshake = (NOW - 10 * 60_000) / 1000;

describe('heartbeat / handshake freshness', () => {
    test('recent heartbeat is fresh, stale and missing are not', () => {
        expect(isFreshHeartbeat(fresh, { now: NOW })).toBe(true);
        expect(isFreshHeartbeat(stale, { now: NOW })).toBe(false);
        expect(isFreshHeartbeat(null, { now: NOW })).toBe(false);
    });

    test('DB timezone ahead of UTC is tolerated, not treated as the future', () => {
        // MySQL NOW() with session time_zone=+03:00 read as UTC appears ahead.
        expect(isFreshHeartbeat('2026-11-25T14:59:00Z', { now: NOW })).toBe(true);
    });

    test('handshake freshness uses the 180s WireGuard window', () => {
        expect(isFreshHandshake(handshake, { now: NOW })).toBe(true);
        expect(isFreshHandshake(oldHandshake, { now: NOW })).toBe(false);
        expect(isFreshHandshake(0, { now: NOW })).toBe(false);
        expect(Number.isNaN(toEpochMs(undefined))).toBe(true);
    });
});

describe('operational state derivation (no DB writes)', () => {
    const base = { now: NOW };

    test('registered / configuring / awaiting / verifying', () => {
        expect(deriveOperationalState({ setup_status: 'pending', ...base })).toBe('registered');
        expect(deriveOperationalState({ setup_status: 'configuring', last_seen: fresh, ...base })).toBe('verifying');
        expect(deriveOperationalState({ setup_status: 'configuring', last_seen: stale, ...base })).toBe('awaiting_connection');
    });

    test('recent heartbeat + fresh handshake => online', () => {
        expect(deriveOperationalState({
            status: 'online', setup_status: 'configured', last_seen: fresh,
            handshakeEpochSeconds: handshake, ...base
        })).toBe('online');
    });

    test('stale or missing heartbeat => offline', () => {
        expect(deriveOperationalState({
            status: 'online', setup_status: 'configured', last_seen: stale,
            handshakeEpochSeconds: handshake, ...base
        })).toBe('offline');
        expect(deriveOperationalState({ status: 'offline', setup_status: 'configured', ...base })).toBe('offline');
    });

    test('failed VPN => degraded; configured but not yet online stays configured', () => {
        expect(deriveOperationalState({
            status: 'online', setup_status: 'configured', last_seen: fresh,
            handshakeEpochSeconds: oldHandshake, ...base
        })).toBe('degraded');
        expect(deriveOperationalState({
            status: 'offline', setup_status: 'configured', last_seen: fresh,
            vpnRunning: false, ...base
        })).toBe('degraded');
        expect(deriveOperationalState({
            status: 'offline', setup_status: 'configured', last_seen: fresh, ...base
        })).toBe('configured');
    });

    test('explicit failure wins over all other signals', () => {
        expect(deriveOperationalState({
            status: 'online', setup_status: 'failed', last_seen: fresh,
            handshakeEpochSeconds: handshake, ...base
        })).toBe('failed');
    });

    test('every internal state maps to existing schema values', () => {
        expect(toDatabaseState('online')).toEqual({ status: 'online', setup_status: 'configured' });
        expect(toDatabaseState('degraded')).toEqual({ status: 'error', setup_status: 'configured' });
        expect(toDatabaseState('failed')).toEqual({ status: 'error', setup_status: 'failed' });
        expect(toDatabaseState('awaiting_connection').setup_status).toBe('configuring');
    });
});

describe('online promotion guard', () => {
    test('requires configured, fresh heartbeat and a fresh handshake when present', () => {
        const ok = { setup_status: 'configured', last_seen: fresh, handshakeEpochSeconds: handshake };
        expect(canPromoteToOnline({ ...ok, now: NOW })).toBe(true);
        expect(canPromoteToOnline({ ...ok, setup_status: 'configuring', now: NOW })).toBe(false);
        expect(canPromoteToOnline({ ...ok, last_seen: stale, now: NOW })).toBe(false);
        expect(canPromoteToOnline({ ...ok, handshakeEpochSeconds: oldHandshake, now: NOW })).toBe(false);
        expect(canPromoteToOnline({ setup_status: 'configured', last_seen: fresh, vpnRunning: false, now: NOW })).toBe(false);
    });
});
