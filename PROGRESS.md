# ThermalAI — Build Progress

Last updated: 2026-05-23

---

## Blockers

| # | Blocker | Owner | Resolution |
|---|---------|-------|------------|
| B1 | **Render free tier times out** on `tensorflow-cpu==2.16.1` (~450 MB) during ML service build | Deployment | Upgrade Render ML service to paid plan, or swap to Render's native ML service |
| B2 | **Render environment variables** not yet configured in dashboard | Deployment | Set all `backend/.env` keys in Render environment panel before first deploy |

---

## Next Up

1. **[P0]** Resolve B1 — upgrade Render ML plan or confirm workaround before merging to `main`
2. **[P0]** Configure Render dashboard: set backend env vars + `REACT_APP_API_URL` for frontend
3. **[P0]** Add `RENDER_DEPLOY_HOOK_URL` as a GitHub Actions secret (Settings → Secrets → Actions)

---

## Completed ✅

### Core Product (v1.0.0 features)
- [x] Real-time reactor monitoring via Socket.io WebSocket *(2026-05-23)*
- [x] Dual ML ensemble — RF × 0.40 + LSTM × 0.60, 0–100 risk score *(2026-05-23)*
- [x] Linear time-to-critical projection per reactor *(2026-05-23)*
- [x] AI explainability panel (per-reading natural language breakdown) *(2026-05-23)*
- [x] Predictive maintenance forecasting (4 components) *(2026-05-23)*
- [x] Alert center with resolve button + gray/strikethrough resolved state *(2026-05-23)*
- [x] SMS alerts via Twilio on WARNING/CRITICAL *(2026-05-23)*
- [x] Email alerts via Nodemailer on WARNING/CRITICAL *(2026-05-23)*
- [x] Database-backed auth — MongoDB + bcrypt + JWT (24h expiry) *(2026-05-23)*
- [x] Role-based access: `admin` (full) + `operator` (monitoring + resolve) *(2026-05-23)*
- [x] Admin-only thermal runaway simulation endpoint *(2026-05-23)*
- [x] Multi-plant support — 3 plants, 5 reactors (A–E) *(2026-05-23)*
- [x] Sensor simulator `stream_data.py` — SAFE → WARNING → CRITICAL → reset cycle *(2026-05-23)*
- [x] React 19 dashboard with real-time updates (no polling) *(2026-05-23)*

### Production Hardening (this sprint)
- [x] **Repo cleanup** — replaced .gitignore, created .gitattributes (Git LFS for *.h5 *.pkl *.npy), untracked node_modules/logs/binaries *(2026-05-23)*
- [x] **Environment files** — `backend/.env.example`, `frontend/.env.example` with descriptive placeholders *(2026-05-23)*
- [x] **`.claude/` context directory** — 7 reference files (architecture, api-contracts, ml-models, data-models, frontend-patterns, dev-commands, known-issues) *(2026-05-23)*
- [x] **risk_engine.py refactor** — pure importable module, no top-level file I/O, model passed as argument *(2026-05-23)*
- [x] **ML test suite** — `ml-model/tests/test_risk_engine.py`, 14 pytest tests, no TensorFlow required *(2026-05-23)*
- [x] **Winston logging** — `backend/logger.js`, DailyRotateFile transport, all `console.*` replaced *(2026-05-23)*
- [x] **MongoDB TTL index** — 7-day retention + compound index on `reactor_id + timestamp` *(2026-05-23)*
- [x] **Backend test suite** — Jest + supertest, 17 tests across auth/reactors/alerts, no live services *(2026-05-23)*
- [x] **Frontend test suite** — React Testing Library, 24 tests across MetricCard/RiskGauge/api.js *(2026-05-23)*
- [x] **GitHub Actions CI** — `ci.yml`: 3 parallel jobs on every non-main push *(2026-05-23)*
- [x] **GitHub Actions deploy** — `deploy.yml`: tests → Render hook on main; failure commit comment *(2026-05-23)*
- [x] **Docker** — Dockerfiles for all 3 services + `docker-compose.yml` with healthchecks + volumes *(2026-05-23)*
- [x] **CLAUDE.md rewrite** — 12 critical rules, key files table, branch strategy, test commands *(2026-05-23)*
- [x] **DEVELOPMENT.md** — human-facing onboarding guide (Docker + manual start, env vars, tests) *(2026-05-23)*
- [x] **docs/API.md** — full REST + WebSocket reference (13 endpoints, data shapes, error codes) *(2026-05-23)*
- [x] **CHANGELOG.md** — Keep a Changelog format, v1.0.0 release entries *(2026-05-23)*
- [x] **CONTRIBUTING.md** — bug reports, branch naming, conventional commits, PR checklist *(2026-05-23)*
- [x] **requirements.txt** — added scipy, inline comments, Render timeout note *(2026-05-23)*
- [x] **render.yaml** — `--no-cache-dir` flag on ML build command *(2026-05-23)*
- [x] **Branch strategy** — main / develop / feature* / fix* / release* documented and enforced *(2026-05-23)*
- [x] **Git LFS** — `.gitattributes` tracking *.h5, *.pkl, *.npy *(2026-05-23)*

---

## Pending

### [P0] — Deployment blockers (must fix before first production deploy)
- [ ] Resolve Render ML service build timeout (B1 above) — upgrade plan or workaround
- [ ] Set all backend env vars in Render dashboard (MONGO_URI, JWT_SECRET, Twilio, Email)
- [ ] Set `REACT_APP_API_URL` to Render backend URL in Render frontend service env
- [ ] Add `RENDER_DEPLOY_HOOK_URL` as GitHub Actions secret
- [ ] Set `main` branch protection: require 1 review + passing CI (do manually — no gh CLI)
- [ ] Run all 3 test suites locally and confirm green before first push to `main`

### [P1] — Post-launch improvements
- [ ] Per-plant SMS/email contact configuration (currently hardcoded to single numbers)
- [ ] `develop` branch protection rules (require CI to pass before merge)
- [ ] Health dashboard page showing ML service status and uptime metrics
- [ ] Rate limiting on `/api/auth/login` to prevent brute force

### [P2] — Future / post-MVP
- [ ] Real sensor hardware integration (replace `stream_data.py` with hardware driver)
- [ ] ML model retraining pipeline on real sensor data
- [ ] Per-reactor alert thresholds configurable from dashboard (not hardcoded)
- [ ] Audit log for admin actions (simulate, user registration)
- [ ] Refresh token support (current JWT expires hard at 24h)
