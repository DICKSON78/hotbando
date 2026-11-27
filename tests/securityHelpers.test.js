const { redactQuery, redactFields, SENSITIVE_KEYS } = require('../utils/logRedaction');
const { safeSecretEqual } = require('../utils/secretComparison');

describe('request log redaction', () => {
    test('redacts registration secrets but keeps diagnostic parameters', () => {
        const safe = redactQuery({
            secret: 'super-secret-value',
            router_id: 'RT-001',
            serial: 'S-001',
            auto_connect: '1'
        });
        expect(safe.secret).toBe('[REDACTED]');
        expect(safe.router_id).toBe('RT-001');
        expect(safe.serial).toBe('S-001');
        expect(safe.auto_connect).toBe('1');
    });

    test('covers case-insensitive sensitive field names', () => {
        const safe = redactFields({ Password: 'x', 'X-CSRF-Token': 'y', token: 'z', ip: '1.2.3.4' });
        expect(safe.Password).toBe('[REDACTED]');
        expect(safe.token).toBe('[REDACTED]');
        expect(safe.ip).toBe('1.2.3.4');
        expect(SENSITIVE_KEYS.has('registration_secret')).toBe(true);
    });

    test('does not mutate the original request object', () => {
        const original = { secret: 'abc' };
        redactQuery(original);
        expect(original.secret).toBe('abc');
    });
});

describe('shared secret comparison', () => {
    test('accepts equal and rejects unequal secrets with existing boolean semantics', () => {
        expect(safeSecretEqual('same-secret', 'same-secret')).toBe(true);
        expect(safeSecretEqual('same-secret', 'other-secret')).toBe(false);
        expect(safeSecretEqual('', 'x')).toBe(false);
        expect(safeSecretEqual(null, 'x')).toBe(false);
    });
});
