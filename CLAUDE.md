# ThermalAI — Claude Context Guide

> Binding methodology: `docs/METHODOLOGY_BRIEF.md`. This file follows §3 structure.
> Version: 1.1.0 (retrofit 2026-07-04)

---

## 1. What This Is

**ThermalAI** predicts thermal runaway in industrial reactors 10–20 min early via an RF+LSTM ensemble.

**Stack:** React 19 → Express 5 (5000) → Flask ML (5001) → MongoDB Atlas  
**Auth:** JWT (24h, localStorage), roles: admin / operator  
**Real-time:** Socket.io broadcasts every reactor update  
**Logging:** Winston + daily-rotate-file (`backend/logger.js`)  
**Deploy:** Docker-compose (3 svcs, healthchecks); Render.com — frontend, backend, ml-api

---

## 2. Where the Brain Lives

Read in order each session; each file answers a specific question.

| File | Answers |
|---|---|
| `context/MEMORY.md` | Index of all context docs |
| `context/code_map.md` | Full flow spine + per-area ownership tree |
| `context/tunables.md` | Every operator knob — weights, thresholds, TTL, JWT expiry (real values) |
| `memory/MEMORY.md` | Locked decisions, incident records, learned feedback |
| `docs/design/ensemble_locked_spec.md` | Citable clauses C1–C8 for the ensemble — change process required |

**Domain-specific context docs** (load when task touches that area):

| Task type | Load |
|---|---|
| API endpoints / request-response shapes | `context/api-contracts.md` |
| ML ensemble, features, time-to-critical, maintenance | `context/ml-models.md` |
| Frontend pages, components, SocketContext | `context/frontend-patterns.md` |
| MongoDB schemas, indexes, JWT payload | `context/data-models.md` |
| Service topology, data flow, watchdog | `context/architecture.md` |
| Setup, start order, test commands | `context/dev-commands.md` |
| Deployment blockers, security gaps, known bugs | `context/known-issues.md` |

---

## 3. Standing Rules

### STANDING RULE: NO FALSE-SAFE FALLBACKS (set 2026-07-04)

> "When a prediction service is down, the system must never present a fabricated SAFE score as if it were real."

| What | Required behavior |
|---|---|
| Watchdog fallback | Every reading produced while ML is down must carry `ml_degraded: true` |
| Socket broadcast | `system_alert { type: 'ML_DOWN' }` emitted immediately on first detection |
| System alert | A MongoDB Alert document with `reactor_id: 'SYSTEM'` saved on ML-down |
| Frontend | Red `MLStatusBanner` shown on every protected page when `mlStatus === 'down'` |
| Alerts | Must not auto-resolve during an ML-down period |

**Burn case 2026-07-04:** Render ML deploy OOM'd; backend silently returned
`risk_score: 0 / SAFE` for every reactor — operators would have seen "all safe"
while the prediction engine was dead.

**Implementation:** `reactorController.js` sets `ml_degraded`; `App.js` renders `MLStatusBanner`;
`server.js` `checkMLHealth()` emits `system_alert` + saves a MongoDB alert. Test: `watchdog.test.js`.

---

### Conventions (Always Apply)

1. **Backend: CommonJS** (`require`/`module.exports`) — never `import`/`export`.
2. **Frontend: ES modules** (`import`/`export`) — never `require`.
3. **Ports fixed:** ML = 5001, Express = 5000, React = 3000. Never mix.
4. **JWT secret** lives in `backend/.env` as `JWT_SECRET`. Never hardcode.
5. **MongoDB models** in `backend/models/`: Reactor, Alert, User.
6. **Logging:** use `logger.info/warn/error` — never `console.*` in backend.
7. **ML ensemble formula is locked** — see `ensemble_locked_spec.md` clauses C1–C8.
8. **Socket.io events** (`reactor_update`, `new_alert`, `system_alert`) must match exactly
   between backend emitter and frontend listener. See `context/tunables.md`.

---

## 4. Conventions

### Doc-Sync (binding)

Every tracked source file under `backend/`, `frontend/src/`, `ml-model/` is owned by exactly
one `context/` doc. Enforced by `_doc_manifest.json` (GENERATED) + `scripts/build_doc_manifest.sh`
+ `scripts/check_doc_sync.sh --audit`/`--precommit`. Override: `SKIP_DOC_SYNC=1`.
After touching a source file, update its owning doc and regenerate:
```bash
bash scripts/build_doc_manifest.sh
git add context/_doc_manifest.json context/code_map.md
```

**Versioning** (SemVer in `VERSION`), **test hygiene**, and **coverage-delta** rules:
`docs/methodology/conventions.md`.

---

## 5. Active Hooks

### Stop Hook (Claude Code)
After every turn, `.claude/settings.json` runs `scripts/check_doc_sync.sh --warn` —
non-blocking nag if architectural code changed without a doc update.

### Pre-commit Hook
`scripts/pre-commit` (installed at `.git/hooks/pre-commit`) enforces:
1. No direct commits to `main`
2. No `import` statements in backend JS (CommonJS rule)
3. No `console.*` in backend JS (logger rule)
4. File-size guardrail — no staged file over ~8,000 chars (~2,000 tokens), excluding
   lockfiles/minified/build.
5. Doc-sync gate via `scripts/check_doc_sync.sh --precommit`

**Per-machine install step (required on every fresh clone):**
```bash
bash scripts/install_hooks.sh
```

---

## 6. Branch / Release Model

| Branch | Purpose | Merge target |
|---|---|---|
| `main` | Production only — protected, fast-forward-only, always tagged | — |
| `develop` | Integration branch — all features merge here first | `main` via PR |
| `feature/*` | Individual features | `develop` |
| `fix/*` | Hotfixes | `main` + `develop` |
| `release/*` | Release candidates | `main` |

`main` is protected: 1 PR review, CI green, squash merge only.

**Tag ritual** (full procedure: `docs/release_workflow.md`):
```bash
# 1. Update VERSION  2. Update CHANGELOG.md
# 3. Regenerate manifest LAST — tagging first makes the gate fire on next commit
bash scripts/build_doc_manifest.sh
git add VERSION CHANGELOG.md context/_doc_manifest.json context/code_map.md
git commit -m "chore: release vX.Y.Z"
git tag vX.Y.Z
```

**Environment setup** (first time / after clone):
```bash
cp backend/.env.example  backend/.env   # fill MONGO_URI, JWT_SECRET, Twilio, Gmail
cp frontend/.env.example frontend/.env
bash scripts/install_hooks.sh           # install pre-commit hook
bash scripts/setup.sh                   # install Node + Python deps
```

---

## 7. NEVER DO

These are tied directly to the domain risk: **ThermalAI sends real SMS/email alerts to
plant operators and writes to the production MongoDB — a false or suppressed alert has
real-world safety cost.**

1. **Never send test SMS/email via live Twilio/Nodemailer credentials.**
   Use `NODE_ENV=test` (mocks both — see `backend/tests/`).

2. **Never write test data to the production MongoDB.**
   Point `MONGO_URI` at a test/local DB in `.env` when developing; the test suite
   mocks Mongoose models and never touches the real DB.

3. **Never mark a degraded reading as SAFE without `ml_degraded: true`.**
   When both ML calls fail, `risk_score` defaults to 0 (SAFE); the enriched reading
   must always carry `ml_degraded: true`. See the standing rule above.

4. **Never fast-forward production to an untagged commit.**
   Every `main` commit must have a `vX.Y.Z` tag — the deploy workflow triggers on
   push to `main`, so an untagged push ships untracked. Complete the tag ritual.

5. **Never commit directly to `main`.**
   The pre-commit hook blocks it. Use `feature/*` → `develop` → PR to `main`.

6. **Never hand-edit `context/_doc_manifest.json` / `code_map.md`.**
   GENERATED files; the hook blocks stale manifests. Regenerate with
   `bash scripts/build_doc_manifest.sh`.

7. **Never commit `.env`. All four historical secrets are compromised until rotated.**
   `.gitignore` blocks `.env` / `.env.*`. The 2026-05-09/10 leak (`8c88d92`, `674dd66`,
   `650db89`, `158d0f6`) is NOT remediated — see `docs/SECRET_ROTATION.md`. Full
   posture: `docs/SECURITY_AUDIT.md`.
