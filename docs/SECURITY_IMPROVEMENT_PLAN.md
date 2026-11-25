# HotBando Security Improvement Plan (READ-ONLY AUDIT)

No secret values are reproduced in this document. No credential was rotated,
no environment variable was changed, and no production file was edited.

## Completed in this phase (low-risk, backward compatible)

| Finding | Remediation applied |
|---|---|
| Global request logger serialized `req.query`, including the zero-touch secret (`index.js:188-193`) | `utils/logRedaction.js` now redacts secret/password/token/key fields; wired into `index.js`. |
| Shared-secret comparison used `!==` (`routes/zeroTouch.js:219-228`) | `utils/secretComparison.js` uses a constant-time comparison; wired into `authRegister`. |
| Router IDs with query-string delimiters could corrupt generated URLs | `utils/routerIdentity.js` validates identifier format before registration. |

## Critical — requires owner decision + coordinated change

1. **Public bootstrap endpoint leaks the registration secret.** `GET /api/zero-touch/bootstrap` (`routes/zeroTouch.js:280-287`) is unauthenticated and returns a script generated with the secret embedded (`utils/routerProvision.js:242-264`). Anyone who can reach the server can obtain the secret and register arbitrary routers.
   - Proposal: serve a template containing a placeholder; have the installer inject the secret locally (as `freeradius/mikrotik-zero-touch.ready.rsc` does), or gate the endpoint behind an admin session/one-time token. Must be tested physically before changing the one-paste flow.
2. **Secrets in URL query strings** (`routerProvision.js:316,423,451,783`; `zeroTouch.js:220,278,337-338,400`). URLs are stored in proxy/access logs (and the global logger previously logged them).
   - Proposal: switch bootstrap/poll/heartbeat to RouterOS `/tool fetch http-method=post http-data=...` with the secret in the body; server already accepts body secrets. Requires router-side script change + physical test.
3. **Secret-bearing RouterOS scripts are tracked and publicly served.** Several `.rsc` files under `public/` and `freeradius/` contain hard-coded shared secrets; `index.js:88` serves `public/` statically and `Dockerfile:29` copies them into the image.
   - Proposal: move to template files with placeholders, exclude them from Docker build context and static serving, rotate affected secrets **after** deployment of the templated flow. No rotation in this phase.
4. **Plaintext HTTP fallback for provisioning** (`routerProvision.js:41,337-354`) and `check-certificate=no` on a script-download/import path (`:322-326,344`).
   - Proposal: HTTPS-only for provisioning; install a CA on managed routers so `check-certificate=yes` can be used for poll/heartbeat. Physical test required — fresh routers may currently depend on the HTTP fallback.
5. **MAC authentication is spoofable.** Router-supplied MAC is trusted (`hotspotController.js:54-74`) and FreeRADIUS MAC-auth accepts on MAC match alone (`freeradius/perl/hotbando_auth.pl:62-74,139-142`).
   - Proposal: bind MAC authorization to NAS identity/router and add rate limits; validate against DHCP lease where possible.
6. **Portal onWifi can be set by any caller knowing a registered router id** (`routes/hotspotApi.js:24-67`). Prepared strict eligibility helper exists (`utils/portalRouterIdentity.js`) but is not enforced to avoid breaking the current UX. Needs product decision and portal testing.

## High — schedule in follow-up branches

- Hardcoded fallback credentials/passwords in source (`utils/routerProvision.js:43`, `utils/routerManager.js:24`, `config/middleware.js:29`, `freeradius/*`, seed scripts, docs). Replace with fail-closed configuration and generated secrets; rotate only after deployment.
- Weak/ predictable voucher and order references via `Math.random()` (`controllers/clickpesaController.js:11-15`, `routes/clickpesa.js:14-17`). Use `crypto.randomBytes`.
- `crypt()` vs bcrypt mismatch in FreeRADIUS Perl auth (`hotbando_auth.pl:162-166`); replace with a supported bcrypt check.
- WireGuard private/preshared keys stored unencrypted in DB (`schema.sql:178-179`) and interpolated into generated scripts; consider at-rest encryption and redacted logging.
- RADIUS accounting SQL interpolates request attributes into literals (`freeradius/sql/mysql/queries.conf`); enforce character allow-listing (partially present in `mods-available/sql:66`).
- `DB_SESSION_TIMEZONE` interpolated into `SET time_zone` without validation (`config/database.js:20-23`); allow-list values.
- Debug endpoints returning stacks / temporary passwords (`utils/debugRegister.js:44-46`, `hqController.js:267-284`, `routes/business.js:759`).

## Medium / configuration

- CSRF skip list includes state-changing endpoints and all `/api/zero-touch/*` (`index.js:154-185`); narrow the skip list to genuinely public router endpoints.
- In-memory rate limiter is not shared across PM2 workers (`middleware/security.js:91-150`); use Redis.
- App port 3000 exposed and nginx HTTP-only while HSTS is emitted (`docker-compose*.yml`, `nginx/default.conf`); terminate TLS and restrict exposure.
- `.env.example` contains only ClickPesa keys; docs tell operators to copy it for production (`README.md`, `docs/DEPLOYMENT.md`). Complete the example with **names only** (no values).
- `.env.production` and secret-bearing `.rsc` files are in the Docker build context; fix `.dockerignore`.

## Explicitly not done in this phase

No credentials rotated; no `.env`/`.env.production` edit; no production config change; no secret value copied into any report, log or test fixture.
