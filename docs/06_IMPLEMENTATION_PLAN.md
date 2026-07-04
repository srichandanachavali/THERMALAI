# ThermalAI — Implementation Plan

**Version:** 1.1.0  
**Date:** 2026-07-04

This document records the original implementation sequence and the v1.1.0 retrofit tasks.

---

## v1.0.0 — Initial Implementation (complete)

Completed 2026-05-23. All items shipped:

1. **MongoDB + Mongoose** — Reactor, Alert, User schemas with TTL and compound indexes
2. **Flask ML API** — Lazy-loading RF + LSTM, all prediction endpoints, explainability, maintenance
3. **Express backend** — Auth (JWT + bcrypt), reactor stream, alert CRUD, plant data, Socket.io
4. **ML ensemble** — RF×0.40 + LSTM×0.60, time-to-critical, predictive maintenance
5. **React frontend** — SocketContext, ReactorDetail, Alerts, Home, Analytics, MultiPlant
6. **Dual UI components** — RiskGauge, ExplainPanel, MaintenancePanel, AIComparison, CountdownTimer
7. **Alert delivery** — Twilio SMS + Nodemailer email, 5-min cooldown per reactor
8. **Admin simulate runaway** — Hardcoded CRITICAL reading injection for testing
9. **ML watchdog** — 30s poll, system_alert socket event, MongoDB SYSTEM alert
10. **Auth seeding** — admin/admin123, operator/op123 on cold start
11. **Docker + docker-compose** — All 3 services with healthchecks and volumes
12. **CI/CD** — ci.yml (parallel tests) + deploy.yml (Render hook)
13. **Test suites** — Jest/supertest (backend), RTL (frontend), pytest (ml-model)
14. **Git LFS** — Model files (.h5, .pkl, .npy)
15. **Winston logging** — Replaced all console.* in backend
16. **Branch strategy** — main/develop/feature/fix/release

---

## v1.1.0 — Methodology Retrofit (complete)

Completed 2026-07-04. Brings codebase into full compliance with `docs/METHODOLOGY_BRIEF.md`.

| Task | What | Status |
|---|---|---|
| T1 | Move .claude/*.md → context/ + MEMORY.md index | Done |
| T2 | YAML frontmatter on all context docs (modules/tests/references) | Done |
| T3 | scripts/build_doc_manifest.sh — sole writer of manifest + code_map | Done |
| T4 | scripts/check_doc_sync.sh (--audit/--precommit/--warn) + _doc_sync_common.sh | Done |
| T5 | scripts/install_hooks.sh + pre-commit updated to call doc-sync gate | Done |
| T6 | .claude/settings.json Stop hook → check_doc_sync.sh --warn | Done |
| T7 | memory/ with README, MEMORY index, 3 seed files | Done |
| T8 | docs/design/ensemble_locked_spec.md (C1–C8), ADR-001/002 superseded | Done |
| T9 | context/tunables.md with all operator knobs | Done |
| T10 | STANDING RULE: NO FALSE-SAFE FALLBACKS + ml_degraded flag + tests | Done |
| T11 | CLAUDE.md restructured to §3 order | Done |
| T12 | VERSION 1.1.0, CHANGELOG [1.1.0], docs/release_workflow.md | Done |
| T13 | Coverage audit, watchdog test, context/open_work.md, context/roadmap.md | Done |
| T14 | docs/01–06 THERMALAI-specific | Done |
| T15 | Self-test the gates (block + pass + audit line) | Done |
| T16 | Commit + tag v1.1.0 | Done |

---

## Next Steps (v1.2.0 candidates)

See `context/roadmap.md` and `context/open_work.md` for the full prioritized list.
Top candidates:
1. Fix Render ML deployment (tensorflow-cpu swap) — P0 safety
2. Frontend tests for SocketContext ML-down transitions — P0
3. Per-plant SMS/email contact routing — P1
4. Persist `latestReadings` to MongoDB — P1
