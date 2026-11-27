/**
 * Router identity helpers — SAFE, ADDITIVE VALIDATION.
 *
 * These helpers do not replace the existing registration flow. They are
 * intended to wrap `resolveRouter()` so that conflicting identities are
 * rejected before any INSERT/UPDATE can touch an existing router record.
 *
 * Design constraints:
 *  - read-only: every database call issued here is a SELECT
 *  - backward compatible: raw identifiers are always queried first, so
 *    legacy records with unusual serial formatting remain recognizable
 *  - no schema changes: no UNIQUE index or column is assumed
 *  - no secret values are ever included in errors or log messages
 */

const MAX_ROUTER_ID_LENGTH = 50;   // mikrotiks.router_id VARCHAR(50)
const MAX_SERIAL_LENGTH = 100;     // mikrotiks.serial_number VARCHAR(100)

// Mirrors normalizeSerial(): upper-case and drop the separators seen in
// RouterOS serials (spaces, colons from CHR time strings, dots, slashes).
// Using a SQL expression keeps this a read-only, schema-free compatibility
// lookup for legacy rows that were stored verbatim.
const SERIAL_NORMALIZED_SQL =
    "UPPER(REPLACE(REPLACE(REPLACE(REPLACE(serial_number, ' ', ''), ':', ''), '.', ''), '/', '')) = ?";

class RouterIdentityError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'RouterIdentityError';
        this.code = code || 'ROUTER_IDENTITY_ERROR';
    }
}

class RouterIdentityValidationError extends RouterIdentityError {
    constructor(message) {
        super(message, 'ROUTER_IDENTITY_INVALID');
        this.name = 'RouterIdentityValidationError';
    }
}

class RouterIdentityConflictError extends RouterIdentityError {
    constructor(message, details = {}) {
        super(message, 'ROUTER_IDENTITY_CONFLICT');
        this.name = 'RouterIdentityConflictError';
        this.details = details; // ids only — never keys, passwords or secrets
    }
}

/**
 * Normalize a router ID for comparison.
 * Accepts the identifier formats already produced by HotBando
 * (RT-001, HB-<serial>, router-<timestamp>-<random>, numeric strings).
 * Returns null for an absent/blank identifier.
 */
function normalizeRouterId(value) {
    if (value === null || value === undefined) return null;
    const id = String(value).trim();
    if (!id) return null;
    if (/[\u0000-\u001f\u007f]/.test(id) || /\s/.test(id)) {
        throw new RouterIdentityValidationError('router_id contains invalid characters');
    }
    if (id.length > MAX_ROUTER_ID_LENGTH) {
        throw new RouterIdentityValidationError(`router_id exceeds ${MAX_ROUTER_ID_LENGTH} characters`);
    }
    // Addresses a real risk: query-string delimiters in an identifier can
    // corrupt generated bootstrap URLs. Parameterized SQL is used regardless.
    if (!/^[A-Za-z0-9][A-Za-z0-9._:@-]*$/.test(id)) {
        throw new RouterIdentityValidationError('router_id has an unsupported format');
    }
    return id;
}

/**
 * Normalize a serial number for a *secondary* lookup only.
 * The raw value is always queried too, so legacy serials (spaces, colons,
 * lower case) continue to match their existing database records.
 */
function normalizeSerial(value) {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    if (/[\u0000-\u001f\u007f]/.test(raw)) {
        throw new RouterIdentityValidationError('serial_number contains invalid characters');
    }
    if (raw.length > MAX_SERIAL_LENGTH) {
        throw new RouterIdentityValidationError(`serial_number exceeds ${MAX_SERIAL_LENGTH} characters`);
    }
    return raw.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase() || null;
}

/** Validate that at least one usable identifier was supplied. */
function validateRouterIdentity({ routerId, serial } = {}) {
    const normalizedId = normalizeRouterId(routerId);
    const normalizedSerial = normalizeSerial(serial);
    if (!normalizedId && !normalizedSerial) {
        throw new RouterIdentityValidationError('router_id or serial_number is required');
    }
    return { routerId: normalizedId, serial: serial === null || serial === undefined ? null : String(serial).trim(), normalizedSerial };
}

function idsOf(rows) {
    return (rows || []).map(row => row.id);
}

/**
 * Resolve both identifiers INDEPENDENTLY and detect conflicts.
 *
 * @param {{routerId?:string, serial?:string}} identifiers
 * @param {{execute:Function}} db injected database (SELECT-only usage)
 * @returns {Promise<{router: object|null, byRouterId: object|null,
 *                    bySerial: object[], normalizedSerial: string|null}>}
 * @throws {RouterIdentityValidationError|RouterIdentityConflictError}
 */
async function resolveRouterIdentity(identifiers = {}, db) {
    if (!db || typeof db.execute !== 'function') {
        throw new RouterIdentityError('A database handle is required', 'ROUTER_IDENTITY_DB_ERROR');
    }
    const { routerId, serial, normalizedSerial } = validateRouterIdentity(identifiers);

    // LIMIT 2 is deliberate: it lets us DETECT duplicate serial rows instead
    // of silently choosing one with LIMIT 1.
    let byRouterId = null;
    if (routerId) {
        const [rows] = await db.execute(
            'SELECT * FROM mikrotiks WHERE router_id = ? LIMIT 2', [routerId]);
        if (rows.length > 1) {
            throw new RouterIdentityConflictError('router_id matches more than one router', {
                ids: idsOf(rows)
            });
        }
        byRouterId = rows[0] || null;
    }

    const bySerial = [];
    if (serial) {
        // 1) exact raw match — preserves every existing record as-is
        const [exactRows] = await db.execute(
            'SELECT * FROM mikrotiks WHERE serial_number = ? LIMIT 2', [serial]);
        bySerial.push(...exactRows);

        // 2) compatibility match — legacy CHR serials may include spaces,
        //    colons or mixed case. Query the normalized form as an expression
        //    so no schema change or data migration is required.
        if (normalizedSerial && normalizedSerial !== serial) {
            const [normalizedRows] = await db.execute(
                `SELECT * FROM mikrotiks WHERE ${SERIAL_NORMALIZED_SQL} LIMIT 2`,
                [normalizedSerial]);
            const seen = new Set(bySerial.map(row => row.id));
            for (const row of normalizedRows) {
                if (!seen.has(row.id)) {
                    seen.add(row.id);
                    bySerial.push(row);
                }
            }
        }
    }

    if (byRouterId && bySerial.length > 1 && !bySerial.some(r => r.id === byRouterId.id)) {
        throw new RouterIdentityConflictError(
            'router_id and serial_number do not identify the same router', {
                ids: idsOf(bySerial)
            });
    }
    if (!byRouterId && bySerial.length > 1) {
        throw new RouterIdentityConflictError(
            'serial_number is ambiguous; supply the router_id of the existing router', {
                ids: idsOf(bySerial)
            });
    }
    if (byRouterId && bySerial.length === 1 && byRouterId.id !== bySerial[0].id) {
        throw new RouterIdentityConflictError(
            'router_id and serial_number do not identify the same router', {
                ids: [byRouterId.id, bySerial[0].id]
            });
    }

    return {
        router: byRouterId || bySerial[0] || null,
        byRouterId,
        bySerial,
        normalizedSerial
    };
}

/** True for any error raised by this module. */
function isRouterIdentityError(error) {
    return error instanceof RouterIdentityError;
}

/** Map known identity errors to HTTP status codes without changing other errors. */
function httpStatusForIdentityError(error) {
    if (error && error.code === 'ROUTER_IDENTITY_CONFLICT') return 409;
    if (error && error.code === 'ROUTER_IDENTITY_INVALID') return 400;
    return null;
}

module.exports = {
    RouterIdentityError,
    RouterIdentityValidationError,
    RouterIdentityConflictError,
    normalizeRouterId,
    normalizeSerial,
    validateRouterIdentity,
    resolveRouterIdentity,
    isRouterIdentityError,
    httpStatusForIdentityError
};
