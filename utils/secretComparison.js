/**
 * Constant-time comparison for shared secrets.
 * Keeps the existing boolean semantics — only the comparison algorithm changes.
 */

const crypto = require('crypto');

function safeSecretEqual(provided, expected) {
    if (typeof provided !== 'string' || typeof expected !== 'string') return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    // Length is public information; compare digests so inputs of any length
    // produce fixed-size buffers for timingSafeEqual.
    const ha = crypto.createHash('sha256').update(a).digest();
    const hb = crypto.createHash('sha256').update(b).digest();
    return a.length === b.length && crypto.timingSafeEqual(ha, hb);
}

module.exports = { safeSecretEqual };
