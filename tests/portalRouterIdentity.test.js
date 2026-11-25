const { collectRouterCandidates, assessPortalRouter } = require('../utils/portalRouterIdentity');

describe('portal router identity candidates', () => {
    test('query param wins, then header, then session, then user binding', () => {
        expect(collectRouterCandidates({
            query: { router_id: 'RT-QUERY' },
            headers: { 'x-router-id': 'RT-HEADER' },
            session: { routerID: 'RT-SESSION' },
            user: { last_router_id: 'RT-USER' }
        })).toEqual(['RT-QUERY', 'RT-HEADER', 'RT-SESSION', 'RT-USER']);
    });

    test('wrong router identity in the query does not hide a header-provided one', () => {
        expect(collectRouterCandidates({
            query: { routerID: 'WRONG' },
            headers: { 'x-router-id': 'RT-CORRECT' }
        })).toEqual(['WRONG', 'RT-CORRECT']);
    });

    test('header-only portal entry is now detectable', () => {
        expect(collectRouterCandidates({ headers: { 'x-router-id': 'RT-HEADER' } }))
            .toEqual(['RT-HEADER']);
    });

    test('duplicates removed, malformed values ignored', () => {
        expect(collectRouterCandidates({
            query: { routerID: ' RT-1 ' },
            session: { routerID: 'RT-1' },
            headers: { 'x-router-id': 'bad id' }
        })).toEqual(['RT-1']);
    });
});

describe('eligibility report (strict mode prepared, default unchanged)', () => {
    const row = (overrides = {}) => ({
        is_active: 1, status: 'online', setup_status: 'configured',
        last_seen: '2026-11-25 11:59:00', ...overrides
    });
    const now = Date.parse('2026-11-25T12:00:00Z');

    test('default mode preserves current registered => onWifi behavior', () => {
        expect(assessPortalRouter(row({ status: 'offline' }))).toEqual({ onWifi: true, reason: 'registered' });
        expect(assessPortalRouter(null)).toEqual({ onWifi: false, reason: 'not_registered' });
    });

    test('strict mode distinguishes offline / unconfigured / stale', () => {
        expect(assessPortalRouter(row(), { strict: true, now })).toMatchObject({ onWifi: true });
        expect(assessPortalRouter(row({ status: 'offline' }), { strict: true, now })).toMatchObject({ reason: 'router_offline' });
        expect(assessPortalRouter(row({ setup_status: 'pending' }), { strict: true, now })).toMatchObject({ reason: 'router_not_configured' });
        expect(assessPortalRouter(row({ last_seen: '2026-11-25 10:00:00' }), { strict: true, now })).toMatchObject({ reason: 'heartbeat_stale' });
        expect(assessPortalRouter(row({ is_active: 0 }), { strict: true, now })).toMatchObject({ reason: 'inactive' });
    });
});
