// Rate limit kwa njia zote za /api/admin (inatumia limiter ya ndani ya security.js)
const { rateLimit } = require('./security');

const adminRateLimit = rateLimit({
    windowMs: 60 * 1000, // dakika 1
    max: 300,            // maombi 300 kwa dakika kwa kila mtumiaji/IP
});

module.exports = { adminRateLimit };
