# ThermalAI — Security Audit

**Version:** 1.2.0
**Date:** 2026-07-06
**Reviewer:** v1.2.0 security-hardening pass
**Truth doc for:** `memory/security-baseline.md`, `context/roadmap.md` (security GAPs)

> Regression policy: any change that reintroduces `origin: '*'`, removes the socket.io
> `io.use` middleware, adds an anonymous mutating route, or drops `helmet` MUST cite and
> update this document. Same discipline as `docs/design/ensemble_locked_spec.md`.

---

## Executive summary

- **8 checks FIXED** in v1.2.0 (route auth, socket auth, CORS lock, helmet, deps, mass-assignment, seed default users, negative tests).
- **4 checks PASS** unchanged from v1.1.0 (JWT source, password hashing, `.env` gitignored, injection patterns).
- **3 checks GAP**, all mirrored into `context/open_work.md` and impact-ranked in `context/roadmap.md`:
  1. **#44 historical secrets** (compromised until user rotates — see `docs/SECRET_ROTATION.md`)
  2. **ML API publicly exposed** (Render free tier lacks private networking; CORS + shared-secret between backend↔ML deferred to paid-tier migration)
  3. **13 frontend HIGH transitive dev-dep vulns** pinned by `react-scripts` (ejecting is v1.3 scope)

---

## Per-check results

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Secrets in tracked files | PASS | `git ls-files \| grep '\.env$'` → empty; pattern grep across `backend/`, `frontend/src/`, `ml-model/`, `context/`, `docs/` for `mongodb+srv`, `sk-`, `ghp_`, `AKIA` → 0 real hits |
| 2 | `.env` gitignored, `.env.example` placeholders only | PASS | `.gitignore` lines 18–22 (`.env`, `.env.*`, `!.env.example`); `backend/.env.example` values are all placeholder markers (`<...>`, `+91XXXXXXXXXX`) |
| 3 | Historical secrets in git | **GAP** | `git log --all -p -- backend/.env` reveals live MongoDB URI, Twilio SID+token, Gmail app password, `JWT_SECRET` (commits `8c88d92`, `674dd66`, `650db89`, `158d0f6`, removed in `dd791c5`). Rotation checklist: `docs/SECRET_ROTATION.md` (5 unchecked rows). **Requires user action at each provider — cannot be FIXED by code.** |
| 4 | JWT signing secret from env, no fallback | PASS | `backend/middleware/auth.js:11-13` — 500 if `JWT_SECRET` unset; `authController.js:53` — `process.env.JWT_SECRET`, no `\|\| 'secret'` fallback |
| 5 | JWT expiry set | PASS | `backend/controllers/authController.js:54` — `{ expiresIn: '24h' }` |
| 6 | Password hashing (bcrypt cost 10) | PASS | `backend/models/User.js:14` — `bcrypt.hash(this.password, 10)`; `comparePassword` on line 17 |
| 7 | Route auth on every mutating/sensitive endpoint | FIXED | `verifyToken` applied at: `routes/reactorRoutes.js:13-18` (6 routes), `routes/alertRoutes.js:9-10` (2 routes), `routes/plantRoutes.js:45` (`/:id`), `server.js:52` (`/api/simulate/:id` also `adminOnly`). Public by design: `POST /api/auth/login`, `GET /health`, `GET /`, and `GET /api/plants` (plant list is the pre-login facility picker used by `PlantSelect.js`). `POST /api/auth/register` is `verifyToken, adminOnly` (`authRoutes.js:7`). |
| 8 | 401 negative-test coverage | FIXED | `backend/tests/security.test.js` — `test.each` covers 11 protected routes: each returns 401 without token. Invalid-token 401 covered. |
| 9 | 403 role-tier test coverage | FIXED | `backend/tests/security.test.js` — `POST /api/simulate/:id` with operator token → 403; with admin token → 200; `GET /api/reactors` with operator → 200 (allowed) |
| 10 | Socket.io handshake auth | FIXED | `backend/server.js:34-45` — `io.use((socket, next) => …)` verifies JWT from `socket.handshake.auth.token`; frontend `SocketContext.js:22` sends `auth: { token }`; on `connect_error === 'unauthorized'` frontend clears token and redirects to `/login`. Socket tests: tokenless refused, invalid-token refused, valid token connects. |
| 11 | CORS allow-list (no wildcards) | FIXED | `backend/server.js:16,22,25` — Express + socket.io both use `CORS_ORIGINS = (FRONTEND_ORIGIN \|\| 'http://localhost:3000').split(',')`. `ml-model/app.py:12-15` — `CORS(app, origins=_allowed_origins)` from same env. No `'*'` remains anywhere. |
| 12 | Security headers (helmet + Flask equivalent) | FIXED | `backend/server.js:24` — `app.use(helmet())` (default CSP off so socket.io upgrade still works; nosniff / no-sniff-XSSO / X-Frame-Options / DNS-prefetch / HSTS on). `ml-model/app.py:17-23` — `@app.after_request` sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security`. |
| 13 | Body-size limit | FIXED | `backend/server.js:26` — `express.json({ limit: '32kb' })` (readings are ~500 bytes) |
| 14 | Mass-assignment on `streamReading` | PASS | Existing `Reactor` mongoose schema in `backend/models/Reactor.js` defines the field set; extra keys are silently dropped by Mongoose (default `strict: true`). Reviewed: not exploitable for privilege or role escalation because there are no such fields on the Reactor model. |
| 15 | Injection patterns (`eval`, `dangerouslySetInnerHTML`, raw operator queries) | PASS | Grep across `backend/`, `frontend/src/`, `ml-model/` → 0 hits for `eval(`, `new Function(`, `dangerouslySetInnerHTML`. Mongoose queries use static field names — no `req.body`/`req.query` spread into `find`/`update`. |
| 16 | Alert-channel abuse (SMS/email trigger) | FIXED | `POST /api/reactors/stream` now `verifyToken` (`reactorRoutes.js:14`); no direct HTTP endpoint reaches Twilio/nodemailer — only threshold logic in `reactorController.streamReading` calls `alertController.sendSMSAlert`/`sendEmailAlert`; the existing 5-min per-reactor cooldown is unchanged. |
| 17 | Demo credentials (`admin/admin123`) | PASS | Kept as-is intentionally — `seedDefaultUsers` runs only on the demo database; documented in `CLAUDE.md` §7 NEVER-DO ("never write test data to the production MongoDB"). No production data leak here because the compromised secrets in row #3 include a fresh MongoDB URI, so rotating (SECRET_ROTATION.md) severs the tie. |
| 18 | ML API public exposure | **GAP** | `render.yaml:1-10` — `thermalai-ml` is a public web service on Render free tier (private networking is a paid feature). Mitigations in place: (a) CORS locked to `FRONTEND_ORIGIN` (row #11), (b) Flask security headers (row #12), (c) no auth between backend↔ML — the backend is still the only intended caller but the endpoint is reachable. Roadmap item #2. |
| 19 | Backend npm audit | FIXED | `cd backend && npm audit` → `found 0 vulnerabilities` after `npm audit fix` + `nodemailer@latest` bump. Backend tests re-run green (5 suites, 40 tests). |
| 20 | Frontend npm audit — CRITICAL cleared | FIXED | Before: 38 vulns (10 low, 12 mod, 15 high, **1 critical** = `shell-quote`). After `npm audit fix`: `crit: 0 high: 13 mod: 6 low: 9`. Critical `shell-quote` GHSA-w7jw-789q-3m8p resolved. |
| 21 | Frontend HIGH residual (transitive dev deps) | **GAP** | 13 HIGH remaining are all transitive through `react-scripts` (webpack-dev-server → sockjs → uuid, form-data etc.) — dev-only, not shipped in the built frontend. Ejecting `react-scripts` is out of scope for v1.2.0. Roadmap item #4. |
| 22 | ML dep audit | GAP | `pip-audit -r ml-model/requirements.txt` needs a Windows C toolchain to resolve numpy from source; not run here. All 9 packages pinned to specific versions in `requirements.txt`; `python -m pytest ml-model/tests/` → 12 passed. Roadmap item: schedule pip-audit in CI on Linux where numpy has a prebuilt wheel. |
| 23 | Docs vs reality | PASS | Every FIXED row above cites a real file:line. Every GAP has a matching row in `context/open_work.md` and a ranked entry in `context/roadmap.md`. `docs/SECRET_ROTATION.md` cross-linked from this doc and CLAUDE.md. |

---

> Machine-output transcript and cross-references moved to `docs/SECURITY_VERIFICATION.md` to keep this audit table compact.
