---
title: ThermalAI — Roadmap
description: Planned features and quality improvements, impact-ranked
modules: []
tests: []
references:
  - context/open_work.md
  - context/known-issues.md
---

# ThermalAI — Roadmap

> Impact ranking: Safety > Reliability > Operability > Developer Experience

---

## P0 — Safety / Correctness

| Item | Effort | Why |
|---|---|---|
| Fix Render ML deployment (tensorflow-cpu) | S | ML service is currently undeployable on free tier — all production risk scores are degraded |
| Add server-side auth guard to `/api/simulate/:id` | XS | Any HTTP client can trigger a simulated runaway; currently only frontend-guarded |
| Test SocketContext ML-down transitions | S | Frontend banner is the operator's only visual indicator that scores are fabricated |

---

## P1 — Reliability

| Item | Effort | Why |
|---|---|---|
| Per-plant SMS/email contact routing | M | A CRITICAL event on Chennai reactor (Gamma) currently pages the same number as Hyderabad (Alpha) |
| Persist `latestReadings` to MongoDB | M | Backend restart causes ~10s blind window (GET /api/reactors returns `[]`) |
| Persist `smsCooldown` to MongoDB | S | Restart resets cooldown — first CRITICAL after restart sends SMS even if one was sent minutes ago |
| Integration test for Flask ML endpoints | M | HTTP-level contract of `/predict`, `/predict-lstm`, `/predict-time` is completely untested |

---

## P2 — Operability

| Item | Effort | Why |
|---|---|---|
| Frontend tests for Alerts page (resolve flow) | S | Resolve button is a safety-adjacent action (resolving a real alert) |
| Frontend test for MLStatusBanner | XS | Banner is the only visual cue during degraded mode |
| Maintenance prediction unit tests | S | Urgency thresholds in `predictive_maintenance.py` are untested |
| ML model retraining on real sensor data | L | Current model trained on synthetic data; real data will differ |

---

## P3 — Developer Experience

| Item | Effort | Why |
|---|---|---|
| Fix `risk_engine.py` top-level model load | XS | Crashes with `FileNotFoundError` if run standalone without LFS objects pulled |
| Delete `lstm_best.h5` duplicate | XS | 460 KB wasted in Git LFS |
| Add CSP headers at Render/nginx level | S | Mitigates localStorage JWT XSS risk (ADR-003) |
| Upgrade Render plan for ML service | L | Removes the TF OOM blocker without changing requirements.txt |

---

## Future (post-MVP)

| Item | Notes |
|---|---|
| Real sensor hardware integration | Replace `stream_data.py` with PLC/SCADA interface |
| Multi-tenant plant isolation | Currently all reactors share one Socket.io namespace |
| Model versioning and A/B scoring | Canary new model weights against production |
| Grafana / observability dashboard | Export Winston logs + MongoDB metrics |
| High-availability Render setup | Paid plan + health-check auto-restart |
