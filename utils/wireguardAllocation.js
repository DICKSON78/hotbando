/**
 * Safe WireGuard address allocation — additive, isolated, testable.
 *
 * This module never writes to the database and never generates keys. It only
 * reads the existing allocation sources (DB rows, published peer descriptors,
 * host status file) and selects an unused address. Unlike the legacy
 * getNextAvailableIp(), it NEVER falls back to a hard-coded address on error.
 *
 * Concurrency: allocations are serialized within a single Node process and a
 * short-lived pending set prevents two in-flight registrations from receiving
 * the same address. Cross-process atomicity still requires a database UNIQUE
 * constraint, which is deliberately NOT added in this phase (see report).
 */

class WireGuardAllocationError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'WireGuardAllocationError';
        this.code = code;
        this.details = details;
    }
}

const DEFAULT_NETWORK = '10.7.0.0/16';
const DEFAULT_SERVER_IP = '10.7.0.1';
const PENDING_TTL_MS = 60_000;

const pendingAllocations = new Map(); // ip -> expiresAt
let allocationQueue = Promise.resolve();

function resetAllocationState() {
    pendingAllocations.clear();
    allocationQueue = Promise.resolve();
}

function isIPv4(value) {
    if (typeof value !== 'string' || !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return false;
    return value.split('.').every(part => {
        const n = Number(part);
        return n >= 0 && n <= 255 && String(n) === String(parseInt(part, 10));
    });
}

function ipToInt(ip) {
    return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function intToIp(value) {
    return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.');
}

/** Parse a CIDR network and return inclusive usable bounds. */
function parseNetwork(cidr = DEFAULT_NETWORK) {
    const match = String(cidr).trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
    if (!match || !isIPv4(match[1])) {
        throw new WireGuardAllocationError('Invalid WireGuard network CIDR', 'INVALID_NETWORK');
    }
    const prefix = Number(match[2]);
    if (prefix < 8 || prefix > 30) {
        throw new WireGuardAllocationError('WireGuard network prefix must be between /8 and /30', 'INVALID_NETWORK');
    }
    const base = ipToInt(match[1]) & (0xffffffff << (32 - prefix)) >>> 0;
    const size = 2 ** (32 - prefix);
    return { base, prefix, size, first: base + 1, last: base + size - 2 };
}

function parseReservedList(value) {
    if (!value) return [];
    return String(value).split(/[,\s]+/).map(s => s.trim()).filter(isIPv4);
}

/** Pure planner — no I/O. Returns an unused address or throws. */
function planNextIp({ network = DEFAULT_NETWORK, serverIp = DEFAULT_SERVER_IP, usedIps = [], reservedIps = [], now = Date.now() } = {}) {
    const range = parseNetwork(network);
    if (!isIPv4(serverIp)) {
        throw new WireGuardAllocationError('Invalid WireGuard server address', 'INVALID_SERVER_IP');
    }

    const used = new Set();
    for (const ip of usedIps) {
        if (!isIPv4(ip)) continue; // ignore malformed legacy values, never emit them
        used.add(ipToInt(ip));
    }
    used.add(ipToInt(serverIp));
    used.add(range.base);                 // network address
    used.add(range.base + range.size - 1); // broadcast address
    for (const ip of parseReservedList(reservedIps)) used.add(ipToInt(ip));
    for (const [ip, expires] of pendingAllocations) {
        if (expires > now) used.add(ipToInt(ip));
        else pendingAllocations.delete(ip);
    }

    for (let n = range.first; n <= range.last; n++) {
        if (!used.has(n)) return intToIp(n);
    }
    throw new WireGuardAllocationError('No available WireGuard addresses in configured network', 'NO_AVAILABLE_IP', {
        network,
        usedCount: used.size
    });
}

/** Mark an address as committed so it stops being treated as "pending". */
function markAllocated(ip) {
    if (ip) pendingAllocations.delete(ip);
}

/** Return an address to the pool after a failed registration. */
function releaseAllocation(ip) {
    if (ip) pendingAllocations.delete(ip);
}

function withAllocationLock(task) {
    const run = allocationQueue.then(task, task);
    allocationQueue = run.then(() => undefined, () => undefined);
    return run;
}

/**
 * Read every allocation source and choose an address.
 * Requires an injected db handle and fs implementation → fully mockable.
 */
async function allocateWireGuardIp({
    db,
    fs,
    peersDir,
    statusFile,
    network = DEFAULT_NETWORK,
    serverIp = DEFAULT_SERVER_IP,
    reservedIps = [],
    now = Date.now()
} = {}) {
    if (!db || typeof db.execute !== 'function') {
        throw new WireGuardAllocationError('Database handle required for IP allocation', 'DB_UNAVAILABLE');
    }

    return withAllocationLock(async () => {
        const usedIps = [];

        let rows;
        try {
            [rows] = await db.execute(
                'SELECT wireguard_ip FROM mikrotiks WHERE wireguard_ip IS NOT NULL AND wireguard_ip != \'\''
            );
        } catch (error) {
            // Deliberately NO fallback address: failing closed is safer than
            // colliding with an existing peer.
            throw new WireGuardAllocationError(
                'Cannot allocate WireGuard IP: database allocation read failed',
                'DB_UNAVAILABLE', { cause: error.message }
            );
        }
        for (const row of rows) usedIps.push(row.wireguard_ip);

        if (fs && peersDir) {
            try {
                for (const name of fs.readdirSync(peersDir)) {
                    if (name.endsWith('.peer')) usedIps.push(name.slice(0, -5));
                }
            } catch (e) { /* peer directory may not exist yet */ }
        }

        if (fs && statusFile) {
            try {
                const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
                for (const ip of (status.allowedIps || [])) usedIps.push(ip);
            } catch (e) { /* host status may not exist yet */ }
        }

        const ip = planNextIp({ network, serverIp, usedIps, reservedIps, now });
        pendingAllocations.set(ip, now + PENDING_TTL_MS);
        return ip;
    });
}

module.exports = {
    WireGuardAllocationError,
    DEFAULT_NETWORK,
    DEFAULT_SERVER_IP,
    isIPv4,
    parseNetwork,
    parseReservedList,
    planNextIp,
    allocateWireGuardIp,
    markAllocated,
    releaseAllocation,
    resetAllocationState
};
