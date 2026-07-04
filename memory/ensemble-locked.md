---
name: ensemble-locked
description: Ensemble spec (weights, thresholds, degraded-mode rules) locked on 2026-07-04; truth doc = docs/design/ensemble_locked_spec.md
metadata:
  type: project
---

The ThermalAI ensemble specification was formally locked on 2026-07-04 as part of the
v1.1.0 methodology retrofit.

Truth doc: `docs/design/ensemble_locked_spec.md` (clauses C1–C8)

ADR-001 and ADR-002 in `DECISIONS.md` are now marked superseded — they remain for
historical context only.

**Why:** The ensemble weights (RF×0.40, LSTM×0.60) and status thresholds (SAFE<30,
WARNING 30-69, CRITICAL≥70) affect real plant operator decisions. Locking them
behind a formal spec and change process prevents accidental drift.

**How to apply:** Any proposal to change weights or thresholds must cite this spec,
produce a new ADR with benchmark data, and update both the spec and this memory record.
