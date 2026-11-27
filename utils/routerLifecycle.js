/**
 * Router lifecycle / telemetry interpretation — PREPARATION ONLY.
 *
 * The existing database uses:
 *   status       ENUM('online','offline','maintenance','error')
 *   setup_status VARCHAR(20) / ENUM('pending','configuring','configured','failed')
 *
 * This module introduces a CLEAR INTERNAL vocabulary (registered,
 * configuring, awaiting_connection, verifying, configured, online, degraded,
 * offline, failed) WITHOUT writing new values to the database. Every state
 * maps back to existing values via toDatabaseState(), so the dashboard and
 * API contracts remain untouched.
 *
 * Nothing here mutates a router. It is intended for heartbeat/handshake
 * verification and for the owner's physical-router test.
 */

const HEARTBEAT_MAX_AGE_MS = 5 * 60 * 1000;
const HANDSHAKE_MAX_AGE_MS = 180 * 1000;
// MySQL sessions use time_zone='+03:00' while Node compares UTC dates. A
// DATETIME interpreted as UTC can therefore appear up to 3h in the future.
const CLOCK_SKEW_TOLERANCE_MS = 3 * 60 * 60 * 1000;

const LIFECYCLE_STATES = Object.freeze([
    'registered', 'configuring', 'awaiting_connection', 'verifying',
    'configured', 'online', 'degraded', 'offline', 'failed'
]);

/** Map an internal state onto values the current schema/frontend already know. */
function toDatabaseState(state) {
    const map = {
        registered: { status: 'offline', setup_status: 'pending' },
        configuring: { status: 'offline', setup_status: 'configuring' },
        awaiting_connection: { status: 'offline', setup_status: 'configuring' },
        verifying: { status: 'offline', setup_status: 'configuring' },
        configured: { status: 'offline', setup_status: 'configured' },
        online: { status: 'online', setup_status: 'configured' },
        degraded: { status: 'error', setup_status: 'configured' },
        offline: { status: 'offline', setup_status: 'configured' },
        failed: { status: 'error', setup_status: 'failed' }
    };
    return map[state] || map.offline;
}

/** Convert a DB DATETIME / Date / epoch into milliseconds, or NaN. */
function toEpochMs(value) {
    if (value === null || value === undefined || value === '') return NaN;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    const text = String(value).trim().replace(' ', 'T');
    return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(text) ? text : text + 'Z');
}

function isFreshHeartbeat(lastSeen, { now = Date.now(), maxAgeMs = HEARTBEAT_MAX_AGE_MS } = {}) {
    const seen = toEpochMs(lastSeen);
    if (!Number.isFinite(seen)) return false;
    const age = now - seen;
    if (age < 0) return Math.abs(age) <= CLOCK_SKEW_TOLERANCE_MS; // DB timezone ahead
    return age <= maxAgeMs;
}

/** WireGuard status file stores epoch seconds with 0 meaning "never". */
function isFreshHandshake(handshakeEpochSeconds, { now = Date.now(), maxAgeMs = HANDSHAKE_MAX_AGE_MS } = {}) {
    const seconds = Number(handshakeEpochSeconds);
    if (!Number.isFinite(seconds) || seconds <= 0) return false;
    const age = now - seconds * 1000;
    if (age < 0) return Math.abs(age) <= CLOCK_SKEW_TOLERANCE_MS;
    return age <= maxAgeMs;
}

/**
 * Derive the internal lifecycle state from observable data.
 * Precedence: failure > provisioning > verified online > degraded > offline.
 */
function deriveOperationalState({
    status,
    setup_status,
    last_seen,
    handshakeEpochSeconds = null,
    vpnRunning = null,
    now = Date.now()
} = {}) {
    const context = { now };

    if (setup_status === 'failed' || status === 'error') return 'failed';

    if (setup_status === 'pending') return 'registered';
    if (setup_status === 'configuring') {
        if (!isFreshHeartbeat(last_seen, context)) return 'awaiting_connection';
        return 'verifying';
    }

    // From here the router is configured (or legacy status is unknown).
    if (!isFreshHeartbeat(last_seen, context)) return 'offline';

    const hasHandshakeData = handshakeEpochSeconds !== null && handshakeEpochSeconds !== undefined;
    if (hasHandshakeData) {
        if (isFreshHandshake(handshakeEpochSeconds, context)) return 'online';
        return 'degraded'; // heartbeat works but VPN peer has no recent handshake
    }
    if (vpnRunning === true) return 'online';
    if (vpnRunning === false) return 'degraded';
    // No VPN evidence available: keep the existing status rather than guessing.
    return status === 'online' ? 'online' : 'configured';
}

/**
 * Guard for promoting a router to ONLINE. Requires a configured router, a
 * recent heartbeat AND (when available) a recent WireGuard handshake.
 */
function canPromoteToOnline({
    setup_status,
    last_seen,
    handshakeEpochSeconds = null,
    vpnRunning = null,
    now = Date.now()
} = {}) {
    if (setup_status !== 'configured') return false;
    if (!isFreshHeartbeat(last_seen, { now })) return false;
    const hasHandshakeData = handshakeEpochSeconds !== null && handshakeEpochSeconds !== undefined;
    if (hasHandshakeData) return isFreshHandshake(handshakeEpochSeconds, { now });
    if (vpnRunning === false) return false;
    return true;
}

module.exports = {
    LIFECYCLE_STATES,
    HEARTBEAT_MAX_AGE_MS,
    HANDSHAKE_MAX_AGE_MS,
    toDatabaseState,
    toEpochMs,
    isFreshHeartbeat,
    isFreshHandshake,
    deriveOperationalState,
    canPromoteToOnline
};
