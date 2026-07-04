---
title: ThermalAI — Operator Tunables
description: Every operator-adjustable knob in the system — plain-English meaning, config key/file, current value, and rationale
modules: []
tests: []
references:
  - context/architecture.md
  - context/ml-models.md
  - context/api-contracts.md
  - docs/design/ensemble_locked_spec.md
---

# ThermalAI — Operator Tunables

> **CAVEAT:** The values quoted in this table were read from the live source files at
> the time of the v1.1.0 retrofit (2026-07-04). Keys are the source of truth — values
> quoted here may be stale. Always re-read the live config/source at query time before
> acting on any value.

---

## Ensemble & Scoring

| Meaning | Config key / file | Current value | Why |
|---|---|---|---|
| Random Forest weight in ensemble | Literal in `backend/controllers/reactorController.js` line ~72 | `0.40` | RF captures instantaneous anomalies; lower weight because it has no temporal memory (locked: see C2) |
| LSTM weight in ensemble | Literal in `backend/controllers/reactorController.js` line ~72 | `0.60` | LSTM detects temporal drift — the primary runaway precursor (locked: see C2) |
| SAFE threshold (upper bound, exclusive) | Literal in `backend/controllers/reactorController.js` ~line 75 | `30` | Below this ensemble score, reactor is operating normally (locked: see C4) |
| WARNING threshold (lower bound, inclusive) | Literal in `backend/controllers/reactorController.js` ~line 76 | `30` | At or above this, operator alert is triggered (locked: see C4) |
| CRITICAL threshold (lower bound, inclusive) | Literal in `backend/controllers/reactorController.js` ~line 75 | `70` | SMS + email triggered; degraded readings flagged (locked: see C4) |
| Time-to-critical reference temperature | Literal in `ml-model/app.py` (`CRITICAL_TEMP`) | `162°C` | Empirically derived boundary for thermal runaway onset |

All ensemble clauses are locked — do not change without a formal ADR. See `docs/design/ensemble_locked_spec.md`.

---

## ML Watchdog

| Meaning | Config key / file | Current value | Why |
|---|---|---|---|
| Watchdog poll interval | `setInterval(checkMLHealth, ...)` in `backend/server.js` line 148 | `30000 ms` (30 s) | Balances detection latency with network overhead; fires immediately on startup too |
| Watchdog health-check timeout | `{ timeout: ... }` in `checkMLHealth()` in `backend/server.js` line 114 | `5000 ms` (5 s) | Long enough for a cold Flask startup; short enough not to block the event loop |
| ML service URL | `ML_URL` env var → `backend/.env` | `http://localhost:5001` (local) / `http://ml:5001` (Docker) | Flask ML API port; set via `ML_URL` in `.env` |

---

## Alerts & Notifications

| Meaning | Config key / file | Current value | Why |
|---|---|---|---|
| SMS / email cooldown per reactor | `cooldownPeriod` in `backend/controllers/reactorController.js` line 112 | `300000 ms` (5 min) | Prevents alert storms during prolonged CRITICAL conditions |
| SMS recipient phone | `ALERT_PHONE` in `backend/.env` | (set in .env — not hardcoded) | Single global number; per-plant routing is a known gap (see known-issues.md #3) |
| Email sender | `EMAIL_USER` in `backend/.env` | (set in .env) | Gmail app password required |

---

## Database

| Meaning | Config key / file | Current value | Why |
|---|---|---|---|
| Reactor readings TTL (auto-delete) | TTL index on `reactors.timestamp` in MongoDB | `604800 s` (7 days) | Prevents unbounded growth; 5 reactors × 2s interval = ~216 k docs/day |
| History query limit | `Reactor.find(...).limit(50)` in `reactorController.js` | `50 readings` | Balances page load vs. chart granularity |
| Maintenance prediction minimum readings | `readings.length >= 5` check in `ml-model/app.py` | `5` | Minimum for LinearRegression trend fit to be meaningful |

---

## Auth & Session

| Meaning | Config key / file | Current value | Why |
|---|---|---|---|
| JWT expiry | `{ expiresIn: '24h' }` in `backend/controllers/authController.js` line 54 | `24h` | Single-shift plant operation; forces re-login each day |
| JWT secret | `JWT_SECRET` in `backend/.env` | (never hardcoded) | Must be a strong random string in production |
| Token storage key | `'thermalai_token'` in `frontend/src/pages/Login.js` | `localStorage` key | XSS risk accepted for intranet-only deployment (see ADR-003) |

---

## Ports & Services

| Service | Port | Config |
|---|---|---|
| React frontend | `3000` | `frontend/` — `npm start` |
| Express backend | `5000` | `PORT` env var → `backend/server.js` line 168 |
| Flask ML API | `5001` | hardcoded in `ml-model/app.py` / `ML_URL` env var in backend |

---

## Socket.io Event Names

These string literals appear in both backend (emitter) and frontend (listener). Changing
either without updating both will silently break real-time updates.

| Event | Backend file | Frontend file |
|---|---|---|
| `reactor_update` | `backend/controllers/reactorController.js` | `frontend/src/context/SocketContext.js` |
| `new_alert` | `backend/controllers/reactorController.js` | `frontend/src/context/SocketContext.js` |
| `system_alert` | `backend/server.js` (watchdog) | `frontend/src/context/SocketContext.js` |

---

## LSTM Sequence Parameters

| Meaning | Config key / file | Current value |
|---|---|---|
| LSTM input sequence length | `SEQUENCE_LENGTH` in `ml-model/app.py` | `10` readings |
| Per-reactor buffer type | `reactor_buffers` dict of `deque(maxlen=10)` in `ml-model/app.py` | in-memory (resets on Flask restart) |
