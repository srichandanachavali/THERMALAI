# ThermalAI — Claude Context Guide

> Binding methodology: `docs/METHODOLOGY_BRIEF.md`. This file follows §3 structure.
> Version: 1.1.0 (retrofit 2026-07-04)

---

## 1. What This Is

**ThermalAI** predicts thermal runaway in industrial reactors 10–20 minutes early using an RF+LSTM ensemble.

**Stack:** React 19 → Node/Express 5 (port 5000) → Flask ML API (port 5001) → MongoDB Atlas  
**Real-time:** Socket.io broadcasts every reactor update to all dashboards  
**Auth:** JWT (24h expiry) stored in localStorage, role-based (admin / operator)  
**Logging:** Winston + daily-rotate-file (`backend/logger.js`)  
**Containers:** Docker + docker-compose (all 3 services, healthchecks, volumes)  
**Deploy:** Render.com — frontend (static), backend (Node), ml-api (Python)

---

## 2. Where the Brain Lives

Read these files in order when starting a session. Each answers a specific question.

| File | Answers |
|---|---|
| `context/MEMORY.md` | Index of all context docs — what each one covers |
| `context/code_map.md` | Full flow spine (sensor → ML → MongoDB → socket → UI) + per-area ownership tree |
| `context/tunables.md` | Every operator knob: weights, thresholds, timeouts, TTL, JWT expiry — all with real values |
| `memory/MEMORY.md` | Locked decisions, incident records, learned feedback |
| `docs/design/ensemble_locked_spec.md` | Citable clauses C1–C8 for the RF+LSTM ensemble — change process required |

**Domain-specific context docs** (load when task touches that area):

| Task type | Load |
|---|---|
| API endpoints / request-response shapes | `context/api-contracts.md` |
| ML ensemble, features, time-to-critical, maintenance | `context/ml-models.md` |
| Frontend pages, components, SocketContext | `context/frontend-patterns.md` |
| MongoDB schemas, indexes, JWT payload | `context/data-models.md` |
| Service topology, data flow, watchdog | `context/architecture.md` |
| Setup, start order, test commands, DB queries | `context/dev-commands.md` |
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

**Burn case 2026-07-04:** Render ML deploy failed (TensorFlow ~500 MB OOM on free tier).
Backend silently fell back to `risk_score: 0 / status: SAFE` for every reactor — a plant
operator would have seen "all reactors safe" while the prediction engine was completely dead.

**Implementation:**
- `backend/controllers/reactorController.js` — sets `ml_degraded: true` when both RF and LSTM calls fail
- `frontend/src/App.js` — `MLStatusBanner` reads `mlStatus` from `SocketContext`
- `backend/server.js` — `checkMLHealth()` emits `system_alert` and saves MongoDB alert on ML-down
- Test: `backend/tests/watchdog.test.js` — asserts `ml_degraded` flag on degraded readings

---

### Conventions (Always Apply)

1. **Backend uses CommonJS** (`require`/`module.exports`) — never `import/export` in backend.
2. **Frontend uses ES modules** (`import/export`) — never `require` in frontend.
3. **Ports are fixed:** ML Flask = 5001, Express backend = 5000, React = 3000. Never mix.
4. **JWT secret** is `JWT_SECRET` in `backend/.env`. Never hardcode.
5. **MongoDB models** live in `backend/models/`: Reactor, Alert, User.
6. **Logging:** use `logger.info/warn/error` — never `console.log/warn/error` in backend.
7. **ML ensemble formula is locked** — see `docs/design/ensemble_locked_spec.md` clauses C1–C8.
8. **Socket.io event names** (`reactor_update`, `new_alert`, `system_alert`) must match exactly in
   both backend (emitter) and frontend (listener). See `context/tunables.md`.

---

## 4. Conventions

### Doc-Sync (binding)

Every tracked source file under `backend/`, `frontend/src/`, `ml-model/` must be owned by
exactly one context doc in `context/`. The ownership contract is enforced by:

- `context/_doc_manifest.json` — authoritative file→doc map (GENERATED, never hand-edit)
- `scripts/build_doc_manifest.sh` — sole writer of manifest and `context/code_map.md`
- `scripts/check_doc_sync.sh --audit` — prints `unowned=N double=N dead=N`
- `scripts/check_doc_sync.sh --precommit` — blocks commits that violate the contract
- Override (emergencies only): `SKIP_DOC_SYNC=1 git commit ...`

**When you change a source file**, update its owning context doc, then regenerate:
```bash
bash scripts/build_doc_manifest.sh
git add context/_doc_manifest.json context/code_map.md
```

### Versioning

This project follows **SemVer**: `MAJOR.MINOR.PATCH` in `VERSION`.
- PATCH: bug fix, doc update, test addition
- MINOR: new feature, new context doc, methodology retrofit
- MAJOR: breaking API or schema change

### Test Hygiene

- Run `scripts/check_doc_sync.sh --audit` before running test suites (a clean audit means
  the manifest is current and files are owned — catch doc drift before test drift).
- Never skip a failing test without a corresponding issue in `context/open_work.md`.
- Do not commit commented-out tests.

### Coverage Delta

Before adding a new feature, check `context/open_work.md` for uncovered modules. If your
change touches a module with no test, add at least one meaningful test. The threshold is not
100% coverage — it is "no completely untested module in the critical safety path."

---

## 5. Active Hooks

### Stop Hook (Claude Code)
After every turn, `.claude/settings.json` runs `scripts/check_doc_sync.sh --warn` —
non-blocking; prints nag if architectural code changed without a doc update, plus
uncommitted-changes reminder.

### Pre-commit Hook
`scripts/pre-commit` (installed at `.git/hooks/pre-commit`) enforces:
1. No direct commits to `main`
2. No `import` statements in backend JS (CommonJS rule)
3. No `console.*` in backend JS (logger rule)
4. Doc-sync gate via `scripts/check_doc_sync.sh --precommit`

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

`main` is protected: requires 1 PR review, CI must pass, squash merge only.

**Tag ritual** (see `docs/release_workflow.md` for full procedure):
```bash
# 1. Update VERSION
# 2. Update CHANGELOG.md
# 3. Regenerate manifest LAST — if you tag before regenerating, manifest in the
#    tagged commit is stale and the gate fires on the next commit
bash scripts/build_doc_manifest.sh
git add VERSION CHANGELOG.md context/_doc_manifest.json context/code_map.md
git commit -m "chore: release vX.Y.Z"
git tag vX.Y.Z
```

**Environment setup** (first time or after clone):
```bash
cp backend/.env.example  backend/.env   # fill in MONGO_URI, JWT_SECRET, Twilio, Gmail
cp frontend/.env.example frontend/.env

bash scripts/install_hooks.sh           # install pre-commit hook
bash scripts/setup.sh                   # install Node + Python deps
```

---

## 7. NEVER DO

These are tied directly to the domain risk: **ThermalAI sends real SMS/email alerts to
plant operators and writes to the production MongoDB — a false or suppressed alert has
real-world safety cost.**

1. **Never send test SMS/email through live Twilio/Nodemailer credentials.**
   Use `NODE_ENV=test` which mocks both (see `backend/tests/` for the mock pattern).

2. **Never write test data to the production MongoDB.**
   Set `MONGO_URI` to a test/local database in `.env` when developing. The test suite
   mocks Mongoose models — it never touches the real DB.

3. **Never mark a degraded reading as SAFE without the `ml_degraded` flag.**
   When both ML calls fail, `risk_score` arithmetic defaults to 0 (SAFE). This must
   always be accompanied by `ml_degraded: true` on the enriched reading. See the
   NO FALSE-SAFE FALLBACKS standing rule above.

4. **Never fast-forward production to an untagged commit.**
   Every `main` commit that ships must have a corresponding `vX.Y.Z` tag. The deploy
   workflow in `.github/workflows/deploy.yml` triggers on push to `main` — if you push
   without tagging, the release is untracked. Always complete the tag ritual.

5. **Never commit directly to `main`.**
   The pre-commit hook blocks this. Use `feature/*` → `develop` → PR to `main`.

6. **Never hand-edit `context/_doc_manifest.json` or `context/code_map.md`.**
   These are GENERATED files. The pre-commit hook will block you if the manifest is stale.
   Regenerate with `bash scripts/build_doc_manifest.sh`.
