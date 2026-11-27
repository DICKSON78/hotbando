/**
 * Hotspot portal router-identity helpers — additive and read-only.
 *
 * Fixes the "not connected to HotBando WiFi" false negative caused by the
 * portal ignoring the x-router-id header that the controller already accepts.
 * Also provides (but does not yet enforce) an eligibility check so the owner
 * can decide, after physical testing, whether offline/pending routers should
 * be reported as on-wifi.
 */

const { normalizeRouterId, RouterIdentityValidationError } = require('./routerIdentity');

/** Collect router-id candidates in the same precedence used elsewhere. */
function collectRouterCandidates({ query = {}, headers = {}, session = {}, user = {} } = {}) {
    const candidates = [
        query.routerID || query.routerid || query.router_id,
        headers['x-router-id'],
        session.routerID,
        user.last_router_id || session.hotbando_user?.last_router_id
    ];
    const result = [];
    for (const value of candidates) {
        if (!value) continue;
        let normalized;
        try {
            normalized = normalizeRouterId(value);
        } catch (error) {
            if (error instanceof RouterIdentityValidationError) continue; // never trust malformed ids
            throw error;
        }
        if (normalized && !result.includes(normalized)) result.push(normalized);
    }
    return result;
}

/**
 * Non-enforcing eligibility report for a registered router row.
 * `strict:true` additionally requires an active, non-offline, configured
 * router with a recent heartbeat. Default preserves today's behavior.
 */
function assessPortalRouter(row, { strict = false, now = Date.now(), maxAgeMs = 5 * 60 * 1000 } = {}) {
    if (!row) return { onWifi: false, reason: 'not_registered' };
    if (Number(row.is_active) === 0) return { onWifi: false, reason: 'inactive' };
    if (!strict) return { onWifi: true, reason: 'registered' };

    if (row.status === 'offline' || row.status === 'error' || row.status === 'maintenance') {
        return { onWifi: false, reason: 'router_offline' };
    }
    if (row.setup_status === 'pending' || row.setup_status === 'detected' || row.setup_status === 'failed') {
        return { onWifi: false, reason: 'router_not_configured' };
    }
    const seen = row.last_seen ? Date.parse(String(row.last_seen).replace(' ', 'T') + 'Z') : NaN;
    if (!Number.isFinite(seen) || now - seen > maxAgeMs) {
        return { onWifi: false, reason: 'heartbeat_stale' };
    }
    return { onWifi: true, reason: 'registered_online' };
}

module.exports = { collectRouterCandidates, assessPortalRouter };
