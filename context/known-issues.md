---
title: ThermalAI — Known Issues & Gaps
description: Deployment blockers, security gaps, data-loss risks, and technical debt with fix recommendations
modules: []
tests: []
references:
  - context/architecture.md
  - context/ml-models.md
  - context/api-contracts.md
  - context/data-models.md
---

# ThermalAI — Known Issues & Gaps

> **Security note (2026-07-06):** Historical git-committed credentials remain compromised until rotated at each provider. See `docs/SECRET_ROTATION.md` — 5 unchecked rows. Full security posture: `docs/SECURITY_AUDIT.md`.


---

## 1. Render ML Deployment Failure — TensorFlow Bloat

**Status**: Blocking production ML deployment on Render free/starter tier

**Root cause**: `ml-model/requirements.txt` includes full `tensorflow` (~500 MB).
Render's free tier build times out or runs out of memory installing it.

**Symptoms**: ML service build fails or the container OOMs on startup.
Backend falls back to `risk_score: 0, status: 'SAFE'` for all readings.

**Fix options** (in order of preference):
1. Replace `tensorflow` with `tensorflow-cpu==<version>` in `requirements.txt`
   — removes GPU deps, ~200 MB smaller
2. Pin a specific version: `tensorflow-cpu==2.15.0`
3. Use `tensorflow-io-gcs-filesystem` exclusion in requirements if using tf 2.13+
4. Upgrade Render plan (paid) for 8GB RAM build instance

**Files to change**: `ml-model/requirements.txt`

---

## 2. Test Suite — RESOLVED (v1.0.0)

**Status**: Test suites added for all three services.

- Backend: Jest + supertest — `backend/tests/` (alerts, auth, reactors)
- Frontend: React Testing Library — `frontend/src/**/__tests__/` (MetricCard, RiskGauge, api service)
- ML API: pytest — `ml-model/tests/test_risk_engine.py`

**Remaining gaps**: see `context/open_work.md` for uncovered modules (server.js watchdog, SocketContext,
most frontend pages). Watchdog degraded-mode test added in v1.1.0.

---

## 3. Hardcoded Phone Numbers / Single Alert Recipient

**Status**: Design gap — affects production alerting

**Root cause**: `ALERT_PHONE`, `OPERATOR_PHONE`, `ADMIN_PHONE` in `.env` are
single global values. `alertController.js` always sends to `ALERT_PHONE` regardless
of which plant or reactor triggered the alert.

**Impact**: A CRITICAL event on Reactor E (Gamma Refinery, Chennai) sends SMS to
the same number as Reactor A (Alpha Chemical Works, Hyderabad). No per-plant routing.

**Fix**: Extend the Plant data structure (currently hardcoded in `plantRoutes.js`)
to include contact arrays. Join reactor_id → plant → contacts at alert time.
Requires Plant to become a MongoDB collection or a more structured config file.

---

## 4. No TTL Index on Reactor Readings

**Status**: MongoDB will grow unboundedly

**Root cause**: No TTL index defined on the `reactors` collection. With 5 reactors
sending readings every ~2 seconds, that is ~150 documents/minute or ~216,000/day.

**Fix** (run once in Atlas or mongosh):
```js
db.reactors.createIndex({ timestamp: 1 }, { expireAfterSeconds: 604800 })
```
Retains 7 days of data. Adjust `expireAfterSeconds` as needed.

Also consider an index on `reactor_id` + `timestamp` for history queries:
```js
db.reactors.createIndex({ reactor_id: 1, timestamp: -1 })
```

---

## 5. `risk_engine.py` — Top-Level Model Load Crashes Without pkl File

**Status**: Latent bug in standalone script

**Root cause**: `ml-model/risk_engine.py` opens `saved-models/rf_model.pkl` at
**module import time** (lines 6–8, bare `with open(...)` not inside a function).
If the pkl file is absent (e.g. after a fresh clone before running the train script,
or because pkl files are now Git LFS and not yet pulled), any `import risk_engine`
or `python risk_engine.py` will raise `FileNotFoundError` immediately.

**Note**: `app.py` does **not** import `risk_engine.py` — it has its own
`load_models()` lazy loader. So production is not affected. But any developer
who runs `risk_engine.py` directly without first pulling LFS objects will hit this.

**Fix**: Wrap the `with open(...)` block inside a function (same pattern as
`app.py`'s `load_models()`), or add a `if __name__ == '__main__':` guard.

---

## 6. Simulate Endpoint Has No Server-Side Auth Guard

**Status**: Minor security gap for demo context

**Root cause**: `POST /api/simulate/:id` in `server.js` has no `verifyToken` or
`adminOnly` middleware. The frontend restricts the button to admin role by checking
`localStorage.getItem('thermalai_role')`, but any HTTP client can call the endpoint
directly without a JWT.

**Fix**: Add `verifyToken` and `adminOnly` middleware to the simulate route.

---

## 7. In-Memory State Lost on Backend Restart

**Status**: Known limitation — acceptable for current scale

**Two in-memory stores reset to empty on every backend restart**:

1. `latestReadings` in `reactorController.js` — GET /api/reactors returns `[]` until
   `stream_data.py` sends at least one reading per reactor (~10 seconds after restart)
2. `global.smsCooldown` — all per-reactor SMS cooldown timers reset, so the first
   CRITICAL reading after a restart triggers an SMS even if one was sent minutes ago

**Fix**: Persist `latestReadings` to Redis or MongoDB on update; persist cooldown
timestamps to MongoDB. Out of scope for current demo deployment.

---

## 8. `lstm_best.h5` is a Duplicate

**Status**: Wasted storage — not a bug

`ml-model/saved-models/lstm_best.h5` (~460 KB) is an exact duplicate of
`lstm_model.h5`. `app.py` loads `lstm_model.h5` — `lstm_best.h5` is never
referenced in production code. It was likely the intermediate output of training
(`ModelCheckpoint` saves best epoch to `lstm_best.h5`; the final copy was renamed
to `lstm_model.h5`).

**Fix**: Delete `lstm_best.h5` once confirmed. Both files are now tracked via Git LFS.
