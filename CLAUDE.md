# ThermalAI — Claude Context Guide

> This file tells Claude everything needed to work effectively in this codebase.
> Detailed references live in `.claude/` — load them when the task touches that domain.

---

## What This Project Is

**ThermalAI** is an AI-powered thermal runaway prevention platform for chemical/pharmaceutical industrial plants. It predicts dangerous reactor conditions **10–20 minutes before they happen** using a dual ML ensemble (Random Forest + LSTM), gives operators real-time risk scores, explainability, predictive maintenance forecasts, and triggers SMS/email alerts.

**Stack**: React 19 → Node/Express 5 → Flask ML API (port 5001) → MongoDB Atlas  
**Real-time**: Socket.io (WebSocket) pushes every reactor update to all dashboards  
**Auth**: JWT stored in localStorage, role-based (admin / operator)  
**Logging**: Winston + daily-rotate-file (backend/logger.js)  
**Containers**: Docker + docker-compose (all 3 services)

---

## Repo Structure

```
THERMALAI/
├── CLAUDE.md
├── docker-compose.yml               ← all 3 services, network, volumes, healthchecks
├── .github/workflows/ci.yml         ← parallel tests on every non-main push
├── .github/workflows/deploy.yml     ← tests → Render deploy hook on push to main
├── .claude/                         ← architecture, api-contracts, ml-models,
│                                       data-models, frontend-patterns, dev-commands,
│                                       known-issues
├── frontend/  (port 3000)  Dockerfile  src/components/__tests__/
├── backend/   (port 5000)  Dockerfile  logger.js  tests/
└── ml-model/  (port 5001)  Dockerfile  tests/
```

---

## Critical Rules (Always Apply)

1. **Backend uses CommonJS** (`require`/`module.exports`) throughout — never use `import/export` there.
2. **Frontend uses ES modules** (`import/export`) — never use `require` there.
3. **The ML Flask API runs on port 5001**, backend on **5000**, frontend on **3000**. Never mix them up in URLs.
4. **JWT secret is in `backend/.env`** as `JWT_SECRET`. Never hardcode it.
5. **MongoDB models** are in `backend/models/`. Reactor, Alert, User, Plant.
6. **`seedDefaultUsers()`** in `authController.js` runs on startup — seeds only if users collection is empty. Default: `admin/admin123`, `operator/op123`.
7. **bcrypt** is used for password hashing via `User.pre('save')` hook and `user.comparePassword()`.
8. **Socket.io events** that matter: `reactor_update` (new reading), `new_alert` (alert created), `system_alert` (ML_DOWN/ML_RECOVERED).
9. **Alert `resolved` field** — `Alerts.js` handles resolved state (gray/strikethrough). Backend: `PUT /api/alerts/:id/resolve`.
10. **ML ensemble**: `risk_score = RF_score × 0.40 + LSTM_score × 0.60`. Status: <30 SAFE, 30–69 WARNING, ≥70 CRITICAL.
11. **Always develop on `develop` branch** — never commit feature work directly to `main`. Use `feature/*` branches, merge to `develop`, then PR to `main`.
12. **Tests must pass before merging** — CI runs all 3 test suites on every push. A failing suite blocks the deploy workflow from triggering the Render hook.

---

## Key Files to Know

| File | What it does |
|------|-------------|
| `backend/server.js` | Express setup, Socket.io, MongoDB connect, simulate route, ML watchdog |
| `backend/logger.js` | Winston logger — use `logger.info/warn/error` instead of `console.*` |
| `backend/controllers/reactorController.js` | Stream endpoint — calls ML, computes ensemble, saves, broadcasts |
| `backend/controllers/authController.js` | Login (DB+bcrypt), register (admin-only), seedDefaultUsers |
| `backend/controllers/alertController.js` | Alert CRUD, email (Nodemailer), SMS (Twilio) |
| `backend/models/Reactor.js` | Reactor schema — TTL index (7d) + compound index on reactor_id+timestamp |
| `ml-model/app.py` | Flask ML API — lazy-loads RF + LSTM on first request, all prediction endpoints |
| `ml-model/risk_engine.py` | Pure scoring module — `calculate_risk_score(reading, model)`, no file I/O |
| `ml-model/stream_data.py` | Simulates sensor data (replaces real hardware for now) |
| `frontend/src/context/SocketContext.js` | Global state — reactors[], alerts[], mlStatus via WebSocket |
| `frontend/src/pages/ReactorDetail.js` | Main reactor page — gauge, charts, AI comparison, maintenance |
| `frontend/src/services/api.js` | All axios calls — getReactors, getAlerts, resolveAlert, etc. |
| `docker-compose.yml` | Orchestrates frontend + backend + ml with network, volumes, healthchecks |
| `.github/workflows/ci.yml` | Parallel Jest + react-scripts + pytest on every non-main push |
| `.github/workflows/deploy.yml` | Same tests → Render deploy hook → failure commit comment |

---

## Environment Variables

Copy the example files before first run — **never commit real values**:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### `backend/.env`
```
MONGO_URI=mongodb+srv://...
PORT=5000
JWT_SECRET=thermalai_secret_key_2026
EMAIL_USER=...@gmail.com
EMAIL_PASS=...              # Gmail app password (not account password)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE=+1...
ALERT_PHONE=+91...
OPERATOR_PHONE=+91...
ADMIN_PHONE=+91...
ML_URL=http://localhost:5001
```

### `frontend/.env`
```
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Branch Strategy

| Branch | Purpose | Merge target |
|--------|---------|--------------|
| `main` | Production only — protected, deploys to Render on push | — |
| `develop` | Integration branch — all features merge here first | `main` via PR |
| `feature/*` | Individual features (e.g. `feature/docker-setup`) | `develop` |
| `fix/*` | Hotfixes from main (e.g. `fix/render-requirements`) | `main` + `develop` |
| `release/*` | Release candidates (e.g. `release/v1.1.0`) | `main` |

`main` is protected: requires 1 PR review, CI must pass, squash merge only.

---

## Development Workflow

```bash
git checkout develop && git checkout -b feature/your-feature

cp backend/.env.example  backend/.env   # fill in real values
cp frontend/.env.example frontend/.env

docker-compose up --build               # recommended — starts all 3 services
# OR manually (in order): ml-model/app.py → backend/server.js → frontend npm start
#                          then: python stream_data.py (sensor simulator)

# Before pushing:
cd backend  && npm test
cd frontend && CI=true npm test
cd ml-model && pytest tests/ -v
```

---

## Test Commands

| Suite | Command | Runner |
|-------|---------|--------|
| Backend | `cd backend && npm test` | Jest + supertest |
| Frontend | `cd frontend && CI=true npm test` | react-scripts / RTL |
| ML model | `cd ml-model && pytest tests/ -v` | pytest (no tensorflow) |

CI runs all three in parallel on every push via `.github/workflows/ci.yml`.

---

## Current Implementation Status

### Done
- [x] Real-time reactor monitoring (WebSocket)
- [x] Dual ML ensemble (RF + LSTM) with time-to-critical
- [x] AI explainability panel
- [x] Predictive maintenance panel
- [x] Alert center with resolve button + resolved visual state
- [x] Database-backed auth (MongoDB + bcrypt + JWT)
- [x] Admin-only simulate runaway button
- [x] SMS (Twilio) + Email (Nodemailer) notifications
- [x] Multi-plant support (3 plants, 5 reactors)
- [x] Winston logging (backend/logger.js — all console.* replaced)
- [x] MongoDB TTL index on reactor readings (7-day retention)
- [x] Docker + docker-compose (all 3 services, healthchecks, volumes)
- [x] CI/CD pipeline (ci.yml + deploy.yml with Render deploy hook)
- [x] Test suites (Jest/supertest, React Testing Library, pytest)
- [x] Git LFS for *.h5, *.pkl, *.npy model files
- [x] Branch strategy (main/develop/feature/fix/release)

### Pending / Known Gaps
- [ ] Render ML deployment fix (tensorflow-cpu swap — see `.claude/known-issues.md`)
- [ ] Real sensor data integration (post-production — replace `stream_data.py`)
- [ ] ML model retraining on real data
- [ ] Per-plant SMS/email contacts (currently hardcoded to single numbers)

---

## Load These Files For Deep Work

| Task type | Load |
|-----------|------|
| Adding/changing API endpoints | `.claude/api-contracts.md` |
| Changing ML predictions or features | `.claude/ml-models.md` |
| Working on frontend pages/components | `.claude/frontend-patterns.md` |
| Debugging or deploying | `.claude/known-issues.md` + `.claude/dev-commands.md` |
| Changing DB schemas | `.claude/data-models.md` |
| Understanding service wiring | `.claude/architecture.md` |
