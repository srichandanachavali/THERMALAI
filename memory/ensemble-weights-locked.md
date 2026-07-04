---
name: ensemble-weights-locked
description: RF*0.40 + LSTM*0.60 ensemble formula and SAFE/WARNING/CRITICAL thresholds are locked; must not be changed without a formal ADR
metadata:
  type: project
---

The ensemble risk score is computed in `backend/controllers/reactorController.js` as:

```
risk_score = round( RF_score × 0.40 + LSTM_score × 0.60 )
```

Status thresholds:
- SAFE: risk_score < 30
- WARNING: 30 ≤ risk_score < 70
- CRITICAL: risk_score ≥ 70

**Why:** These weights and thresholds are locked in `docs/design/ensemble_locked_spec.md`
(clauses C1–C4) as of 2026-07-04. They were chosen because LSTM captures temporal drift
better than RF, justifying a higher weight, while RF provides fast single-reading
classification. Changing them without a formal ADR risks calibrating the safety thresholds
incorrectly for real plant operators.

**How to apply:** Before quoting these values, always re-read the live code in
`backend/controllers/reactorController.js` (the ensemble lines) and
`context/ml-models.md` to confirm they have not drifted. The truth doc for the locked
spec is `docs/design/ensemble_locked_spec.md`.
