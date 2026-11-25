/**
 * Redaction for request logging.
 *
 * The global request logger previously serialized req.query verbatim, which
 * included the zero-touch registration secret in URLs. This helper keeps the
 * diagnostic value of the log while removing sensitive values. No request
 * handling behavior is changed.
 */

const SENSITIVE_KEYS = new Set([
    'secret', 'registration_secret', 'radius_secret', 'password', 'passwd',
    'token', 'access_token', 'api_key', 'private_key', 'preshared_key',
    'wpapass', 'csrf', '_csrf', 'session'
]);

function redactValue(key, value) {
    if (!SENSITIVE_KEYS.has(String(key).toLowerCase())) return value;
    return '[REDACTED]';
}

/** Return a shallow copy of a query object with sensitive values removed. */
function redactQuery(query) {
    if (!query || typeof query !== 'object') return query;
    const safe = {};
    for (const [key, value] of Object.entries(query)) {
        safe[key] = redactValue(key, value);
    }
    return safe;
}

/** Redact sensitive keys in a flat body/headers-like object (for diagnostics). */
function redactFields(fields = {}) {
    return redactQuery(fields);
}

module.exports = { SENSITIVE_KEYS, redactValue, redactQuery, redactFields };
