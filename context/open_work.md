---
title: ThermalAI — Open Work & Coverage Gaps
description: Source files with no test coverage, uncovered critical paths, and outstanding implementation gaps
modules: []
tests: []
references:
  - context/architecture.md
  - context/api-contracts.md
  - context/known-issues.md
---

# ThermalAI — Open Work & Coverage Gaps

> Last audited: 2026-07-06 (v1.2.0 security hardening)

---

## Security GAPs (from v1.2.0 audit — see `docs/SECURITY_AUDIT.md`)

| # | GAP | Owner | Why it's not FIXED |
|---|---|---|---|
| 1 | **Historical secrets in git** — MongoDB URI, Twilio SID+token, Gmail app password, `JWT_SECRET` recoverable from commits `8c88d92`, `674dd66`, `650db89`, `158d0f6` | **User (manual)** | Rewriting git history does not undo exposure. Rotation must happen at each provider console. Checklist: `docs/SECRET_ROTATION.md` (5 unchecked rows). |
| 2 | **ML API publicly exposed on Render free tier** | Ops (paid tier) | Render free tier lacks private networking. Mitigations in place: CORS locked to `FRONTEND_ORIGIN`, Flask security headers. Backend↔ML shared-secret deferred pending private-networking migration. |
| 3 | **13 frontend HIGH transitive dev-dep vulns** pinned by `react-scripts` (webpack-dev-server → sockjs → uuid, form-data, etc.) | Frontend | Dev-only; not in shipped bundle. Requires ejecting `react-scripts` or migrating to Vite. Out of scope for v1.2.0. |
| 4 | **`pip-audit` against `ml-model/requirements.txt`** cannot run on Windows without a C toolchain (numpy compiles from source) | CI | Move to a Linux CI job where numpy has a prebuilt wheel; document the run in `.github/workflows/`. |


---

## Test Coverage Gaps

### Critical path (safety-relevant — highest priority)

| File | Owning doc | Gap | Risk |
|---|---|---|---|
| `backend/server.js` | architecture.md | Watchdog loop (`checkMLHealth`) not integration-tested with a real socket | ML-down path could silently regress |
| `ml-model/app.py` | ml-models.md | Flask endpoints (`/predict`, `/predict-lstm`, `/predict-time`, `/explain`, `/maintenance-bulk`) untested at HTTP level | ML API contract could break silently |
| `ml-model/predictive_maintenance.py` | ml-models.md | `run_maintenance_prediction()` called with various sensor histories — no dedicated unit tests | Maintenance forecasts could silently return wrong urgency |

### Backend — no dedicated unit tests

| File | Notes |
|---|---|
| `backend/models/Reactor.js` | Schema validation, TTL index behavior |
| `backend/models/Alert.js` | Schema validation, resolved field |
| `backend/models/User.js` | Password hashing hook, comparePassword |
| `backend/routes/plantRoutes.js` | GET /api/plants and GET /api/plants/:id |
| `backend/logger.js` | Log rotation, level filtering |

### Frontend — no tests

| File / area | Notes |
|---|---|
| `frontend/src/context/SocketContext.js` | Socket event handling, mlStatus transitions |
| `frontend/src/App.js` — MLStatusBanner | Should render/hide on mlStatus changes |
| `frontend/src/pages/Home.js` | MetricCard + ReactorHeatmap integration |
| `frontend/src/pages/Alerts.js` | Resolve button, gray/strikethrough state |
| `frontend/src/pages/ReactorDetail.js` | Gauge + countdown + explainability |
| `frontend/src/pages/Analytics.js` | Chart rendering |
| `frontend/src/pages/MultiPlant.js` | Multi-plant status display |
| `frontend/src/components/Sidebar.js` | Navigation + logout |
| `frontend/src/components/ExplainPanel.js` | Reason list rendering |
| `frontend/src/components/MaintenancePanel.js` | Days-to-failure display |
| `frontend/src/components/CountdownTimer.js` | Timer display + urgency color |
| `frontend/src/components/AIComparison.js` | RF vs LSTM comparison display |
| `frontend/src/components/AlertFeed.js` | Alert list, limit prop |
| `frontend/src/components/ReactorHeatmap.js` | Grid color by status |
| `frontend/src/components/PredictionTimeline.js` | Time-series chart |

### ML model — partial

| File | Notes |
|---|---|
| `ml-model/feature_engineering.py` | Derived features (pressure_temp_ratio, cooling_danger) |
| `ml-model/validate_data.py` | Data validation rules |
| `ml-model/train_model.py`, `train_lstm.py`, `train_xgboost.py` | Training scripts — no smoke tests |
| `ml-model/lstm_prepare_data.py` | Sequence preparation |

---

## Implementation Gaps

| Gap | Priority | Fix |
|---|---|---|
| Render ML deployment (tensorflow-cpu swap) | HIGH | Replace `tensorflow` with `tensorflow-cpu==2.15.0` in `ml-model/requirements.txt` |
| Per-plant SMS/email routing | MEDIUM | Extend Plant data to include contact arrays; join reactor→plant→contacts at alert time |
| In-memory state loss on restart (`latestReadings`, `smsCooldown`) | LOW | Persist to MongoDB; out of scope for current demo |
| Simulate endpoint missing server-side auth | LOW | Add `verifyToken` + `adminOnly` middleware to `POST /api/simulate/:id` |
| `risk_engine.py` top-level model load crash | LOW | Wrap `with open(...)` inside a function (safe for standalone use) |
| `lstm_best.h5` duplicate | INFO | Delete after confirming it matches `lstm_model.h5` |
| Real sensor hardware integration | FUTURE | Replace `stream_data.py` with actual PLC/SCADA interface |
