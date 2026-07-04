# Changelog

All notable changes to ThermalAI are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
