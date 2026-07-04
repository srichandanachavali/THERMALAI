# ThermalAI — Ensemble Locked Specification

**Status:** Locked as of 2026-07-04  
**Supersedes:** ADR-001, ADR-002 (see DECISIONS.md — history preserved there)  
**Truth doc for:** `context/ml-models.md` references, `memory/ensemble-weights-locked.md`

> Changing any clause in this spec requires a new ADR and explicit override of this document.
> The domain risk is real: wrong weights or thresholds cause false-SAFE or false-CRITICAL
> scores delivered to live plant operators.

---

## Citable Clauses

**C1 — Dual-Model Architecture**  
The ensemble must use exactly two models: a Random Forest (RF) classifier and an LSTM
sequence model. Neither may be removed or replaced without a superseding ADR.
RF provides single-reading feature-based classification; LSTM provides temporal pattern
detection across a sliding window of the last 10 readings.

**C2 — Ensemble Weights**  
The ensemble risk score is computed as:
```
risk_score = round( RF_score × 0.40 + LSTM_score × 0.60 )
```
Weights must sum to 1.0. The LSTM weight (0.60) is higher because thermal runaway is
fundamentally a temporal process — slow temperature climb over cycles is the primary
precursor, which RF cannot detect across readings.

**C3 — Score Range**  
`risk_score` is an integer in [0, 100]. Any computed value outside this range must be
clamped before storage or broadcast.

**C4 — Status Thresholds**  
```
risk_score < 30              → SAFE
30 ≤ risk_score < 70         → WARNING
risk_score ≥ 70              → CRITICAL
```
These thresholds must be identical in:
- `backend/controllers/reactorController.js` (ensemble computation)
- `ml-model/risk_engine.py` (RF-only scoring, for standalone use)
- `context/tunables.md` (operator-facing documentation)

**C5 — Degraded Mode**  
If either model is unreachable, its score defaults to 0 (not the other model's score,
not any cached value). The ensemble still computes using the available score.
Every reading produced under degraded conditions must carry `ml_degraded: true`.
A fabricated SAFE score (risk_score: 0 when ML is down) without the `ml_degraded`
flag is a violation of this spec and the NO FALSE-SAFE FALLBACKS standing rule.

**C6 — LSTM Cold Start**  
The per-reactor LSTM buffer (length 10) is pre-filled with the first reading on cold
start. LSTM scores are valid from the first reading but may be less accurate until
10 distinct readings have accumulated. This is acceptable; do not suppress LSTM output
during warm-up.

**C7 — Model Files**  
Production model files:
- RF: `ml-model/saved-models/rf_model.pkl` (sklearn RandomForestClassifier)
- LSTM: `ml-model/saved-models/lstm_model.h5` (Keras Sequential, MinMaxScaler + LabelEncoder)

These files are tracked via Git LFS. Retraining must produce new files with the same
names. `lstm_best.h5` is a training artifact — not loaded in production.

**C8 — Weight Change Process**  
Any change to C2 (weights) or C4 (thresholds) requires:
1. A new ADR (ADR-NNN) with benchmark data showing improvement in F1/recall on the
   thermal runaway test set.
2. An updated version of this document (the old clauses become historical notes).
3. A new memory fact recording the change date and the ADR reference.
4. Re-running the full test suite and verifying no false-SAFE regressions.
