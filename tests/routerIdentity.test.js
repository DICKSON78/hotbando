const {
    normalizeRouterId,
    normalizeSerial,
    validateRouterIdentity,
    resolveRouterIdentity,
    RouterIdentityValidationError,
    RouterIdentityConflictError,
    httpStatusForIdentityError
} = require('../utils/routerIdentity');
const { createMockDb, assertReadOnly } = require('./helpers/mockDb');

const router = (id, rid, serial) => ({ id, router_id: rid, serial_number: serial });

describe('router identifier normalization', () => {
    test('accepts and trims existing identifier formats', () => {
        expect(normalizeRouterId(' RT-001 ')).toBe('RT-001');
        expect(normalizeRouterId('router-1764000000000-abc123')).toBe('router-1764000000000-abc123');
        expect(normalizeRouterId('HB-ABC123')).toBe('HB-ABC123');
        expect(normalizeRouterId('12345')).toBe('12345'); // never coerced to numeric id
    });

    test('rejects invalid router IDs', () => {
        expect(() => normalizeRouterId('')).not.toThrow(); // blank => absent
        expect(normalizeRouterId('')).toBeNull();
        expect(() => normalizeRouterId('bad id')).toThrow(RouterIdentityValidationError);
        expect(() => normalizeRouterId('x?secret=1')).toThrow(RouterIdentityValidationError);
        expect(() => normalizeRouterId('a'.repeat(51))).toThrow(RouterIdentityValidationError);
    });

    test('normalizes serials but preserves raw values for legacy records', () => {
        expect(normalizeSerial('ABC 123')).toBe('ABC123');
        expect(normalizeSerial('chr-2026-11-25 10:30:00')).toBe('CHR-2026-11-25103000');
        expect(() => normalizeSerial('x'.repeat(101))).toThrow(RouterIdentityValidationError);
    });

    test('requires at least one identifier', () => {
        expect(() => validateRouterIdentity({})).toThrow(RouterIdentityValidationError);
        expect(validateRouterIdentity({ routerId: 'RT-1' }).routerId).toBe('RT-1');
    });
});

describe('resolveRouterIdentity — isolated, read-only resolution', () => {
    test('new router: no matches returns null without writing', async () => {
        const db = createMockDb({ mikrotiks: [] });
        const result = await resolveRouterIdentity({ routerId: 'RT-NEW', serial: 'S-NEW' }, db);
        expect(result.router).toBeNull();
        assertReadOnly(db);
        expect(db.calls.every(c => /^SELECT/.test(c.sql))).toBe(true);
    });

    test('existing router by router_id is reused', async () => {
        const existing = router(7, 'RT-001', 'S-001');
        const db = createMockDb({ mikrotiks: [existing] });
        const result = await resolveRouterIdentity({ routerId: 'RT-001' }, db);
        expect(result.router.id).toBe(7);
        expect(result.router).toEqual(existing);
        assertReadOnly(db);
    });

    test('existing router by serial is reused', async () => {
        const existing = router(9, 'HB-ABC', 'ABC 123');
        const db = createMockDb({ mikrotiks: [existing] });
        const result = await resolveRouterIdentity({ serial: 'ABC 123' }, db);
        expect(result.router.id).toBe(9);
        assertReadOnly(db);
    });

    test('normalization finds a legacy record whose stored serial uses different case/spacing', async () => {
        const existing = router(11, 'RT-011', 'CHR-2026-11-25 10:30:00');
        const db = createMockDb({ mikrotiks: [existing] });
        // incoming serial differs in spacing/case from the stored value
        const result = await resolveRouterIdentity({ serial: 'chr-2026-11-25 10:30:00' }, db);
        expect(result.router.id).toBe(11);
    });

    test('both identifiers resolving to the SAME record is accepted', async () => {
        const existing = router(3, 'RT-003', 'S-003');
        const db = createMockDb({ mikrotiks: [existing] });
        const result = await resolveRouterIdentity({ routerId: 'RT-003', serial: 'S-003' }, db);
        expect(result.router.id).toBe(3);
        assertReadOnly(db);
    });

    test('conflicting identifiers are rejected without mutating either record', async () => {
        const a = router(1, 'RT-A', 'S-A');
        const b = router(2, 'RT-B', 'S-B');
        const db = createMockDb({ mikrotiks: [a, b] });
        await expect(resolveRouterIdentity({ routerId: 'RT-A', serial: 'S-B' }, db))
            .rejects.toMatchObject({ code: 'ROUTER_IDENTITY_CONFLICT', details: { ids: [1, 2] } });
        assertReadOnly(db);
    });

    test('ambiguous duplicate serial requires an explicit router_id', async () => {
        const a = router(1, 'RT-A', 'S-DUP');
        const b = router(2, 'RT-B', 'S-DUP');
        const db = createMockDb({ mikrotiks: [a, b] });
        await expect(resolveRouterIdentity({ serial: 'S-DUP' }, db))
            .rejects.toMatchObject({ code: 'ROUTER_IDENTITY_CONFLICT' });
        assertReadOnly(db);
    });

    test('duplicate serial is tolerated when router_id identifies one of them', async () => {
        const a = router(1, 'RT-A', 'S-DUP');
        const b = router(2, 'RT-B', 'S-DUP');
        const db = createMockDb({ mikrotiks: [a, b] });
        const result = await resolveRouterIdentity({ routerId: 'RT-B', serial: 'S-DUP' }, db);
        expect(result.router.id).toBe(2);
    });

    test('conflict and validation errors map to distinct HTTP statuses; other errors unchanged', () => {
        expect(httpStatusForIdentityError(new RouterIdentityConflictError('x'))).toBe(409);
        expect(httpStatusForIdentityError(new RouterIdentityValidationError('x'))).toBe(400);
        expect(httpStatusForIdentityError(new Error('db down'))).toBeNull();
    });
});
