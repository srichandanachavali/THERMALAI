# Changelog

All notable changes to ThermalAI are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.3.0] — 2026-08-11

### Added

- **AI model comparison bench** on the Analytics page (`frontend/src/pages/Analytics.js` + `frontend/src/components/AIComparison.js`) — side-by-side Physics (Arrhenius), XGBoost, Random Forest, and LSTM rows with per-model scores, confidence, and ensemble weight summary (RF×40% + LSTM×60%), driven by the latest reading in the selected window
- Per-model scores/confidence wired end-to-end in `backend/controllers/reactorController.js` + `backend/utils/mlClient.js`

## [1.2.0] — 2026-07-06

### Added — Security Hardening (see `docs/SECURITY_AUDIT.md`)

- **`backend/middleware/auth.js`** — single source for `verifyToken` + `adminOnly` (extracted from `authController.js`)
- **`backend/tests/security.test.js`** — 401 negative tests for all 11 protected routes + 403 role tests + socket handshake refusal tests (16 assertions)
- **`backend/tests/helpers/tokens.js`** — `signAdmin()` / `signOperator()` / `adminHeaders()` / `operatorHeaders()` helpers
- **`helmet()`** on Express + Flask `@app.after_request` security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS)
- **`express.json({ limit: '32kb' })`** — bounded body size
- **Socket.io JWT auth** — `io.use((socket, next) => …)` in `backend/server.js`; frontend `SocketContext.js` sends `auth: { token }` in handshake and force-redirects to `/login` on `connect_error === 'unauthorized'`
- **`docs/SECURITY_AUDIT.md`** — dated per-check table (PASS / FIXED / GAP + evidence)
- **`docs/SECRET_ROTATION.md`** — 5-row checklist for compromised historical credentials (unchecked until user rotates)
- **`memory/security-baseline.md`** — locked baseline with regression policy
- **`FRONTEND_ORIGIN`**, **`SIM_USER`**, **`SIM_PASS`** env vars (documented in `.env.example` and `context/dev-commands.md`)
- **`ml-model/.env.example`** — new file for Flask env template

### Changed

- **Route auth applied** to every mutating/sensitive endpoint. `/api/simulate/:id` is now `verifyToken, adminOnly`. Public routes: `POST /api/auth/login`, `GET /health`, `GET /`.
- **CORS locked to allow-list** on Express, socket.io, and Flask (from `FRONTEND_ORIGIN` env). No `origin: '*'` remains anywhere.
- **`ml-model/stream_data.py`** — simulator logs in at startup using `SIM_USER`/`SIM_PASS` and sends `Authorization: Bearer <token>` on every stream POST
- **`CLAUDE.md` §7 NEVER-DO** — added binding rule 7: never commit `.env`; all four historical secrets remain compromised until rotated

### Fixed — Dependency Hygiene

- **Backend `npm audit`** — bumped `nodemailer` to latest to clear GHSA-p6gq-j5cr-w38f. Result: `found 0 vulnerabilities`.
- **Frontend `npm audit`** — `shell-quote` CRITICAL (GHSA-w7jw-789q-3m8p) resolved via `npm audit fix`. Remaining HIGH are transitive `react-scripts` dev-only vulns (open_work.md GAP #3).
- All test suites re-run green after upgrades: backend 40/40, frontend 25/25, ml-model 12/12.

### Security GAPs (see `docs/SECURITY_AUDIT.md`, `context/open_work.md`, `context/roadmap.md`)

- **Historical secrets in git** — MongoDB, Twilio SID+token, Gmail app password, `JWT_SECRET` recoverable from history. Rotation required at each provider. Top roadmap item.
- **ML API publicly reachable on Render free tier** — private networking is a paid feature.
- **13 frontend HIGH transitive dev-dep vulns** pinned by `react-scripts`.

## [1.1.0] — 2026-07-04

### Added — Methodology Retrofit (docs/METHODOLOGY_BRIEF.md compliance)

- **context/ directory** — all seven architectural context docs moved from `.claude/` to `context/`
- **YAML frontmatter** on all context docs: `title`, `description`, `modules`, `tests`, `references`
- **context/MEMORY.md** — index of all context docs with one-line summaries
- **context/tunables.md** — every operator knob (weights, thresholds, timeouts, TTL, JWT expiry, event names)
- **context/code_map.md** — GENERATED flow spine and by-area ownership tree (via `build_doc_manifest.sh`)
- **context/_doc_manifest.json** — GENERATED file→owning-doc map (sole source of ownership truth)
- **context/open_work.md** — coverage gaps and uncovered modules (impact-ranked)
- **context/roadmap.md** — feature and quality roadmap (impact-ranked)
- **memory/** directory with `README.md`, `MEMORY.md` index, and three seed files:
  `ensemble-weights-locked.md`, `render-tensorflow-oom.md`, `watchdog-degraded-mode.md`, `ensemble-locked.md`
- **docs/design/ensemble_locked_spec.md** — locked spec for RF+LSTM ensemble (clauses C1–C8)
- **docs/release_workflow.md** — tag ritual, manifest-last gotcha, production release steps
- **docs/01_PRD.md** through **docs/06_IMPLEMENTATION_PLAN.md** — THERMALAI-specific project docs
- **docs/LAST_REVIEWED.md** — review timestamp
- **scripts/build_doc_manifest.sh** — sole writer of manifest and code_map.md
- **scripts/check_doc_sync.sh** — `--audit`, `--precommit`, `--warn` modes with SKIP_DOC_SYNC=1 override
- **scripts/_doc_sync_common.sh** — shared logic for doc-sync scripts
- **scripts/install_hooks.sh** — per-machine pre-commit hook installer
- **`.claude/settings.json`** — Stop hook running `check_doc_sync.sh --warn` after every turn
- **backend/tests/watchdog.test.js** — degraded-mode path test (ML down → ml_degraded flag + system alert)

### Changed

- **CLAUDE.md** — restructured to §3 order (what/brain/rules/conventions/hooks/branch/never-do)
- **scripts/pre-commit** — now also calls `check_doc_sync.sh --precommit` (doc-sync gate)
- **DECISIONS.md** ADR-001, ADR-002 — marked superseded by `docs/design/ensemble_locked_spec.md`
- **context/known-issues.md** — Issue #2 (No Test Suite) updated to RESOLVED with remaining gap list
- **context/data-models.md** — TTL index status updated to reflect production deployment
- **VERSION** — bumped from 1.0.0 to 1.1.0

### Fixed — NO FALSE-SAFE FALLBACKS (standing rule)

- **backend/controllers/reactorController.js** — `ml_degraded: true` flag added to `enrichedReading`
  when both RF and LSTM calls fail; previously readings silently carried `risk_score: 0 / SAFE`
- **context/api-contracts.md** — EnrichedReading shape updated to document `ml_degraded` field
- Frontend ML-down banner (`MLStatusBanner` in `App.js`) already present; verified wired to `mlStatus`

### Planned
- Real sensor hardware integration (replace `stream_data.py`)
- ML model retraining on real data
- Per-plant SMS/email contact routing (currently single global number)
- Real sensor hardware integration (replace stream_data.py)
- Per-plant SMS/email contact configuration

## [1.0.0] — 2026-05-23

### Added
- Real-time reactor monitoring via WebSocket (Socket.io)
- Dual ML ensemble: Random Forest × 0.40 + LSTM × 0.60, producing 0–100 risk score
- Status thresholds: SAFE < 30, WARNING 30–69, CRITICAL ≥ 70
- Linear time-to-critical projection displayed per reactor
- AI explainability panel — per-reading natural language breakdown
- Predictive maintenance forecasting (Cooling System, Pressure Vessel, Heat Exchanger, Control System)
- Alert center with resolve functionality and visual resolved state
- SMS alerts via Twilio on WARNING/CRITICAL readings
- Email alerts via Nodemailer on WARNING/CRITICAL readings
- Database-backed authentication (MongoDB + bcrypt + JWT, 24h expiry)
- Role-based access control: `admin` and `operator` roles
- Admin-only thermal runaway simulation endpoint
- Multi-plant support: 3 plants, 5 reactors (A–E)
- Sensor simulator (`stream_data.py`) cycling SAFE → WARNING → CRITICAL → reset
- MongoDB Atlas persistence with reactor reading history
- React 19 dashboard with real-time Socket.io updates (no polling)
