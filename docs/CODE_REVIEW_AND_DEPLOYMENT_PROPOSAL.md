# HotBando Logic Reliability — Code Review & Deployment Proposal

**Phase:** safe logic improvement + physical-router test preparation.
**Branch:** `feature/hotbando-logic-reliability` (created from `master`; not merged).
**No deployment has been performed.**

---

## A. Current architecture

- **Backend:** Express 4 / Node.js (`index.js`), MySQL via `mysql2` (`config/database.js`), Redis sessions/cache, PM2/cluster-ready, Docker Compose deployment.
- **Frontend:** Vue 3 + Vite SPA (`frontend/`), served by Express from `frontend/dist`; hotspot portal routes share the same SPA.
- **Router onboarding is two-phase:**
  1. `POST/GET /api/zero-touch/register` (`routes/zeroTouch.js`, `utils/routerProvision.js`): a fresh router phones home with serial/identity/model/firmware, is registered `status=offline, setup_status=pending`, gets WireGuard keys + a reserved IP, and receives a small wait-and-poll RouterOS script.
  2. Owner clicks Connect → `connectRouter()` publishes a WireGuard peer descriptor (`utils/wireguard.js` → shared dir → host watcher `scripts/hotbando-wg-apply`), sets `setup_status=configuring`, host = tunnel IP. The router's 2-minute poll fetches `GET /api/zero-touch/provision/<id>` → `provisionRouter()` returns the full RouterOS script (tunnel, hotspot, DHCP/DNS/NAT, RADIUS, watchdog, schedulers, portal page).
  3. Router heartbeats every 2 minutes (`/api/zero-touch/heartbeat`) and sets `last_seen=NOW()`, promoting to online when `setup_status='configured'`.
- **WireGuard:** the server is the hub (`10.7.0.1/16`, UDP 51820). The app never writes `wg0.conf`; it writes tab-separated peer descriptors plus an `.apply` marker, and a host watcher runs `wg syncconf`. Runtime handshake data is written to a status JSON consumed by `getWireGuardPeers()`.
- **RADIUS:** FreeRADIUS in Docker (UDP 1812/1813) authenticates hotspot users via `freeradius/perl/hotbando_auth.pl` against MySQL views; RouterOS hotspot profile uses `use-radius=yes`. The Node `utils/radius.js` client is not used by the app.
- **Portal:** `/api/hotspot/session` resolves router identity from query/session, sets `onWifi`, `routerID`, `location`; `requireWifi` gates voucher/ad/connect endpoints. The SPA hides login forms when `!onWifi`.
- **Admin:** `/api/routers/*`, `/api/admin/mikrotik-setup/*`, `/api/router-fleet/*` manage registration, detection, configuration and status; dashboard aggregates DB status + WireGuard peer state.
- **Database:** `mikrotiks` is the source of truth. `router_id` is the only UNIQUE column; `serial_number`, `host`, `wireguard_ip` are neither unique nor indexed. `status` is ENUM(online,offline,maintenance,error), `setup_status` VARCHAR(20)/ENUM in migrations (pending, configuring, configured, failed).

## B. Confirmed issues (code/test evidence only)

| # | Issue | Evidence |
|---|---|---|
| 1 | **`auto_connect=1` always failed**: `connectRouter` was called but never imported. | `routes/zeroTouch.js:23` import list vs `:259` call; regression test in `tests/provisioningFlow.test.js` now passes after the fix. |
| 2 | **`resolveRouter()` OR-query ambiguity**: `WHERE router_id=? OR serial_number=? LIMIT 1` could bind a serial to a different router. | `utils/routerProvision.js:75-88` (original); identity conflict tests in `tests/routerIdentity.test.js`. |
| 3 | **Duplicate serials silently collapsed** by `WHERE serial_number=? LIMIT 1`; no UNIQUE constraint exists. | `utils/routerProvision.js:83-88`; `database/schema.sql:165`. |
| 4 | **Hard-coded `10.7.0.2` fallback** on any allocation error — the same address the code itself lists as a known pre-existing static peer. | `utils/wireguard.js:106-144` (original). |
| 5 | **Allocation ignores `WG_NETWORK`** and is non-atomic between read and DB write. | `utils/wireguard.js:15,132-138`; no UNIQUE on `wireguard_ip` (`schema.sql:176`). |
| 6 | **`provisionRouter()` sets `status='online', setup_status='configured'` when the script is generated**, ignoring the `addPeerToServer()` result and any handshake. | `utils/routerProvision.js:492-500`. Not changed in this phase (see §I). |
| 7 | **Generated PSK is dead data**: generated/stored but blanked at the server peer and never set on the router. | `utils/routerProvision.js:126,130,134`; `utils/wireguard.js:214-222,281-290`; script `:639-645`. |
| 8 | **Portal `/session` equates "registered" with "on WiFi"**, ignoring status/setup/heartbeat. | `routes/hotspotApi.js:37-44,62`. Strict helper prepared, not enforced. |
| 9 | **`x-router-id` header was ignored by `/session`** although the controller accepts it → false "not connected". | `hotspotApi.js:25` vs `controllers/hotspotController.js:120-125`. Fixed additively. |
| 10 | **DB/query failure silently became `onWifi:false`**. | `hotspotApi.js:35-50` (`catch(_){}`). |
| 11 | **Stale router status deadlock**: cached `offline` status blocks `getRouterConnection`, while the stale monitor only logs. | `utils/mikrotik.js:108-121,210-235`; `utils/routerStatusMonitor.js:16-20`. |
| 12 | **Numeric router IDs are treated as numeric DB primary keys** across management helpers. | `routerManager.js:13-19`, `mikrotik.js:112,256`, `setupWizard.js:26,706,779`. |
| 13 | **Admin read/delete use `WHERE id=? OR router_id=?` with the same value**, risking wrong-row read or multi-row delete. | `controllers/adminController.js:1354,1501`. |
| 14 | **GET `/provision/:routerID` can create a router record** (side effect through `resolveRouter`). | `zeroTouch.js:320-325` → `routerProvision.js:471`. |
| 15 | **Bootstrap template claims success without verifying connectivity** and uses HTTP fallback. | `routerProvision.js:337-354,406-408`. |
| 16 | **Registration secret exposed**: public `/api/zero-touch/bootstrap` embeds it; it also travels in query strings and is written to logs. | `routes/zeroTouch.js:280-287`, `routerProvision.js:242-264,316`, `index.js:188-193`. Redaction + timing-safe comparison fixed; disclosure itself needs owner decision. |
| 17 | **Two admin WireGuard endpoints call non-existent service methods** → HTTP 500. | `controllers/adminController.js:2095-2097,2118`. |
| 18 | **`configVersion` in heartbeat is always null**: `updated_at` not selected. | `routes/zeroTouch.js:381-383,393`. |
| 19 | **Heartbeat writes `last_seen` but never consults WireGuard handshake freshness.** | `zeroTouch.js:374-379`; handshake available at `utils/wireguard.js:429-474`. |
| 20 | **MAC address is client-supplied and MAC-auth has no router binding** → spoofable authorization. | `hotspotController.js:54-74`; `freeradius/perl/hotbando_auth.pl:62-74,139-142`. |
| 21 | **Secrets committed in tracked RouterOS scripts and `.env.production`**, served from `public/` and copied into the image. | See `docs/SECURITY_IMPROVEMENT_PLAN.md` (no values reproduced). |

## C. Potential issues (require physical router / production verification)

- Whether the generated full script imports cleanly on the owner's RouterOS version (notably `/interface wifi`, `mac-auth-mode`, `html-directory`, `radius-mac-format`).
- Whether fresh routers have the CA trust needed for HTTPS poll/heartbeat (`check-certificate=yes`), given bootstrap uses `check-certificate=no`.
- Whether `bridge-hotbando` and the DHCP/address removals collide with the owner's existing LAN/WAN setup.
- Real WireGuard handshake behavior through the owner's NAT/firewall and the host watcher (`wg syncconf`).
- Whether the dashboard's `online` flag currently reflects handshake truth or only `setup_status`.
- RADIUS reachability over the tunnel (`1812/1813` UDP) and whether FreeRADIUS sees requests from the router's tunnel source address.
- Whether `DEMO_PAYMENTS`/development toggles or webhook secrets are enabled in the production environment (names only checked; values not read).

## D. Changes made

**Modified existing files (all on the feature branch):**

| File | Why |
|---|---|
| `routes/zeroTouch.js` | Added the missing `connectRouter` import (fixes `auto_connect=1`); added identity-aware HTTP status mapping; timing-safe secret comparison. |
| `utils/routerProvision.js` | `resolveRouter()` now checks both identifiers independently via the new helper before any INSERT/UPDATE; existing records reused, conflicts rejected. |
| `utils/wireguard.js` | `getNextAvailableIp()` delegates to the safe allocator (no hard-coded fallback); `saveRouterWireGuard()` releases/marks pending allocations. |
| `routes/hotspotApi.js` | `/session` now accepts `x-router-id` and uses the non-enforcing eligibility helper (same behavior as `!!registeredRouter` today). |
| `index.js` | Global request log redacts secrets/tokens in `req.query`. |

**New files:**

| File | Why |
|---|---|
| `utils/routerIdentity.js` | Normalization + independent conflict detection, read-only, no schema change. |
| `utils/wireguardAllocation.js` | Safe, serialized, reservable-aware address allocation with meaningful errors. |
| `utils/routerLifecycle.js` | Internal lifecycle states + freshness/handshake verification; maps to existing DB values. |
| `utils/portalRouterIdentity.js` | Router candidate collection (header support) + prepared strict eligibility report. |
| `utils/logRedaction.js`, `utils/secretComparison.js` | Security hardening helpers. |
| `jest.config.js`, `tests/helpers/mockDb.js`, `tests/*.test.js` | Isolated tests; no sockets, no production data. |
| `docs/PHYSICAL_ROUTER_TEST_PLAN.md` | Owner's read-only-first physical test procedure. |
| `docs/SECURITY_IMPROVEMENT_PLAN.md` | Security plan (no secret values). |
| `docs/CODE_REVIEW_AND_DEPLOYMENT_PROPOSAL.md` | This report. |

No database migration, no schema/edit of `.env*`, no Docker/compose or Firewall change, no frontend source change.

## E. Database impact

**NO.** Production schema and records were not modified. All tests use in-memory mocks; no INSERT/UPDATE/DELETE/ALTER was executed against any real database.

## F. Production impact

**NO.** No production service/container was restarted, no code deployed, no live MikroTik contacted, no credential rotated, no firewall/RADIUS change. Only local branch files changed.

## G. Test results (actually executed)

- Baseline `npm test -- --listTests`: **no test files** existed before this phase.
- After changes: `npm test -- --runInBand` → **6 suites passed, 50 tests passed, 0 failed** (router identity 13, WireGuard allocation 11, lifecycle 11, portal identity 6, provisioning flow 6, security helpers 3 — counts include parameterized cases).
- `node --check` on all 15 modified/new JS files: **all OK**.
- `cd frontend && npm run build`: **succeeded** (`✓ built in 9.36s`); no frontend source was changed.

Coverage by required category:
- Registration: new, existing, duplicate/conflicting identity, reconnecting, invalid IDs — `tests/routerIdentity.test.js`, `tests/provisioningFlow.test.js`.
- WireGuard: free/allocated/reserved/concurrent/exhausted/invalid/existing peer — `tests/wireguardAllocation.test.js`.
- Provisioning: normal, `auto_connect=1`, pending/ready headers, conflict rejection, heartbeat needsConfig — `tests/provisioningFlow.test.js` (interrupted/retry/handshake states modeled in `tests/routerLifecycle.test.js`).
- Hotspot: correct/header router detection, malformed IDs, strict eligibility — `tests/portalRouterIdentity.test.js`.
- Monitoring: fresh/stale/missing heartbeat, failed VPN, degraded, promotion guard — `tests/routerLifecycle.test.js`.
- Compatibility: response shapes and DB schema values asserted unchanged in the above tests.

## H. Physical router testing plan

See `docs/PHYSICAL_ROUTER_TEST_PLAN.md`. Order: backup/export → read-only inventory (§3–§10) → owner verification → only then approved `[WRITE]` commands with verification after each → rollback via saved backup.

## I. Outstanding work (requires owner approval / physical test)

1. Owner performs the physical router test and reports inventory + script import output.
2. Decide whether to promote `provisionRouter()` away from `status='online'` at script generation (issue #6) and gate promotion on fresh handshake using `routerLifecycle.canPromoteToOnline()`. **Not changed now** because it would alter dashboard status semantics before physical verification.
3. Decide whether to enable `assessPortalRouter(strict:true)` (issue #8); currently prepared but inactive to preserve login UX.
4. Prepare (not execute) a DB constraint proposal: UNIQUE index on `serial_number`/`wireguard_ip` after auditing real duplicates — requires owner approval and a migration, explicitly out of scope here.
5. Replace secret-in-query-string protocol with body/POST-based registration and remove public bootstrap secret disclosure — requires coordinated router-script change and physical test.
6. Fix the two dead admin WireGuard endpoints (#17), heartbeat `configVersion` (#18), numeric-ID heuristic (#12), and admin OR-delete (#13) in follow-up branches with their own tests.
7. Security remediation plan in `docs/SECURITY_IMPROVEMENT_PLAN.md` — no credentials rotated here.
8. Only after (1)–(7) and explicit approval: code review, merge, staging deploy, then production deployment proposal below.

## J. Git branch / working tree

- Current branch: `feature/hotbando-logic-reliability` (created from `master`, not merged, no commits made in this phase).
- Working tree contains the modified/new files listed in §D; pre-existing developer changes were absent at start (`git status` was clean).
- `master` production branch untouched.

### Deployment proposal (NOT executed)

1. Owner completes physical router test with the read-only-first plan.
2. Review this branch diff; run `npm test -- --runInBand` and `npm run build` in staging.
3. Merge to a staging branch only, deploy to a staging container with an isolated DB; verify registration, auto-connect, hotspot and dashboard with test fixtures.
4. Owner approves secret/protocol changes and any schema/migration proposals separately.
5. Only then schedule a production deployment window with DB backup and rollback; no migration runs automatically.
