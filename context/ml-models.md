---
title: ThermalAI — ML Models
description: RF+LSTM ensemble formula, feature engineering, time-to-critical projection, predictive maintenance, and explainability logic
modules:
  - ml-model/app.py
  - ml-model/risk_engine.py
  - ml-model/config.py
  - ml-model/risk_service.py
  - ml-model/routes_risk.py
  - ml-model/routes_maintenance.py
  - ml-model/maintenance.py
  - ml-model/train_model.py
  - ml-model/train_xgboost.py
  - ml-model/train_lstm.py
  - ml-model/lstm_prepare_data.py
  - ml-model/feature_engineering.py
  - ml-model/predictive_maintenance.py
  - ml-model/schedule_service.py
  - ml-model/validate_data.py
  - ml-model/test.py
  - ml-model/routes_simulation.py
  - ml-model/simulation/reactor_simulator.py
  - ml-model/federated/local_trainer.py
  - ml-model/safety_alerts.py
  - ml-model/sequence_buffer.py
  - ml-model/explain_service.py
  - ml-model/features.py
  - ml-model/sensor_voting.py
  - ml-model/kalman_filter.py
tests:
  - ml-model/tests/test_risk_engine.py
references:
  - context/api-contracts.md
  - docs/design/ensemble_locked_spec.md
---

# ThermalAI — ML Models

## Feature Set (22 features, RF and LSTM)

The served RF (`rf_model.pkl`) trains on **22 features** (`config.FEATURES`),
defined in order: **10 base sensors → 8 physics-derived → 4 rolling stats**.
Online inference builds the identical vector via `features.py`
(`build_feature_vector`) from the current reading + the reactor's buffered
history (`sequence_buffer.reactor_history`).

| # | Feature | Group | Notes |
|---|---|---|---|
| 1 | `temperature` | base | °C, raw reading |
| 2 | `pressure` | base | bar, raw reading |
| 3 | `reaction_rate` | base | 0.0–1.0 |
| 4 | `cooling_efficiency` | base | 0.0–1.0 |
| 5 | `temp_rate_of_change` | base | °C per cycle |
| 6 | `flow_rate` | base | L/min |
| 7 | `material_level` | base | % |
| 8 | `gas_concentration` | base | ppm |
| 9 | `ph_level` | base | pH |
| 10 | `emissions_co2_ppm` | base | ppm |
| 11 | `cooling_danger` | physics | `(1 - cooling) * temp` |
| 12 | `heat_removal_proxy` | physics | `flow * cooling * 0.012` |
| 13 | `runaway_proximity_nitration` | physics | `max(0, (temp-130)/20)` |
| 14 | `pressure_temp_ratio` | physics | `pressure / temp` |
| 15 | `ph_deviation` | physics | `abs(ph - 7)` |
| 16 | `gas_risk` | physics | `min(1, gas/500)` |
| 17 | `material_criticality` | physics | 1 if level < 10 or > 92 |
| 18 | `temp_acceleration` | physics | `roc - prev_roc` |
| 19 | `temp_rolling_avg` | rolling | mean over history window |
| 20 | `pressure_rolling_avg` | rolling | mean over history window |
| 21 | `temp_rolling_std` | rolling | std over history window |
| 22 | `cooling_rolling_min` | rolling | min over history window |

`simulate_data.py` generates the 5-class training set (≈24k rows) using the
Arrhenius physics engine `kinetics.py`; `feature_engineering.py` materializes
the 22-feature frame for training; `features.py` reproduces it online.

## Random Forest Model

- **File**: `ml-model/saved-models/rf_model.pkl` (sklearn RandomForestClassifier)
- **Classes**: `NOMINAL`, `DEGRADING`, `WARNING`, `CRITICAL`, `RECOVERY` (v2.0)
- **Hyperparams**: 200 trees, max_depth 12, min_samples_leaf 5, max_features 'sqrt',
  class_weight 'balanced', n_jobs -1, StratifiedKFold(5) CV
- **Quality** (trained v2.0): CV accuracy ≈98.8%, ROC-AUC ≈0.9997,
  CRITICAL FNR ≈4.8% (< 5% target)
- **Inference** (`calculate_risk_score` in `risk_service.py`):
  1. `build_feature_vector` → 22-vec from reading + history
  2. `model.predict_proba` → 5-class probabilities (stale-width ValueError fallback
     via `model.n_features_in_` for old artifacts)
  3. Blend with LSTM by sequence length (see Ensemble Formula)
  4. `risk_score = degrading×25 + warning×55 + critical×100`, clamped [0, 100]
  5. Status: < 30 → SAFE, < 70 → WARNING, ≥ 70 → CRITICAL (3-state for backend/SIL)
- **Endpoint**: `POST /predict`

## LSTM Model

- **File**: `ml-model/saved-models/lstm_model.h5` (Keras Sequential)
- **Scaler**: `ml-model/saved-models/lstm_scaler.pkl` (MinMaxScaler)
- **Label encoder**: `ml-model/saved-models/lstm_label_encoder.pkl`
- **Sequence length**: `SEQUENCE_LENGTH = 20`
- **Per-reactor buffer**: `sequence_buffer.reactor_buffers` (9-field LSTM vectors) +
  `reactor_history` (raw dicts), both trimmed to `SEQUENCE_LENGTH`.
- **Architecture**: LSTM(128, return_sequences, dropout .2) → LSTM(64) →
  Dense(32 relu) → Dropout(.3) → Dense(5 softmax). Adam lr .001, epochs 50, batch 64,
  EarlyStopping patience 10 + ReduceLROnPlateau.
- **Endpoint**: `POST /predict-lstm` (RF-based fallback when tensorflow absent —
  the deployed service has no TF, so `lstm_weight_used = 0` and the ensemble is RF-only)

## Ensemble Formula

Computed inside `risk_service.calculate_risk_score` (single `/predict` call):

```
if seq_len >= 20:   rf_w, lstm_w = 0.35, 0.65
elif seq_len >= 10: rf_w, lstm_w = 0.50, 0.50
else:               rf_w, lstm_w = 0.80, 0.20
# no LSTM model → rf_w, lstm_w = 1.0, 0.0

blended = normalize( rf_w*rf_probs + lstm_w*lstm_probs )   # 5 classes
prediction = argmax(blended)
models_agree = (rf_class == lstm_class)
confidence = high if agree & max>0.70; medium if >0.50; else low

risk_score = degrading*25 + warning*55 + critical*100   # clamped [0,100]
status: SAFE <30 | WARNING 30-69 | CRITICAL >=70
```

`/predict` also returns `minutes_to_runaway`, `top_risk_factors`, `parameter_alerts`,
`rf_weight_used`, `lstm_weight_used`, `models_agree`, and 5-class `probabilities`
(`nominal/degrading/warning/critical/recovery`). The backend
(`reactorController.js`) reads only `risk_score` and `parameter_alerts` from
`/predict`, so the key change (SAFE→NOMINAL labels, 5-class probs) is transparent.

`/predict` then boosts the model's `risk_score` by +15 for a CRITICAL parameter
alert (+5 for WARNING), and +20 when the sensor-voting layer suspects a fault, then
recomputes `status` once (SAFE<30, WARNING30-69, CRITICAL≥70) after all boosts — so a
boosted risk can never leave a stale SAFE label. A suspected sensor fault floors the
status at WARNING (never SAFE), per the NO-FALSE-SAFE rule.

## Advisory Model Bench (XGBoost + Arrhenius Physics)

Two **advisory** endpoints added in `routes_risk.py` feed the Analytics model-comparison
bench. They never feed the ensemble `risk_score` or the alerts path — only the RF+LSTM
ensemble drives alerting, and `ml_degraded` still tracks the RF+LSTM path.

- **`POST /predict-xgb`** — loads `saved-models/xgb_model.pkl` + `label_encoder.pkl`,
  scores on the 10 original training features (temperature, pressure, reaction_rate,
  cooling_efficiency, temp_rate_of_change, temp_rolling_avg, pressure_rolling_avg,
  temp_acceleration, pressure_temp_ratio, cooling_danger). Class probabilities are
  severity-weighted by substring (critical=100, warning=55, degrading=25, else 0) into
  `xgb_risk_score` [0,100]. Returns
  `{ success, reactor_id, xgb_prediction, xgb_risk_score, xgb_confidence, xgb_probabilities }`.
  If the model is unavailable the endpoint 500s; the backend treats it as advisory-down
  (zeroed SAFE default) and does not flag `ml_degraded`.
- **`POST /predict-physics`** — deterministic Arrhenius risk from `kinetics.py`:
  `k = A·exp(-Ea/(R·T))`, `reaction_rate = clamp(0.5·k/k_design)`, mapped to
  `physics_risk_score = (rate - 0.5)/0.5 × 100` (design point → 0, runaway → 100).
  Reactors use canonical slugs (R-101…R-301); unknown/missing IDs default to R-101.
  Returns `{ success, reactor_id, physics_prediction, physics_risk_score, reaction_rate, note }`.

## Time-to-Critical Prediction

Computed inline in `features.compute_minutes_to_runaway` and mirrored by Flask
`POST /predict-time` (kept for backend compat). Linear projection — no ML model.

```
CRITICAL_TEMP = 162°C

if status == 'CRITICAL':
    minutes_to_critical = 0

elif status == 'WARNING' and temp_rate_of_change > 0:
    degrees_remaining = 162 - current_temp
    cycles_remaining  = degrees_remaining / temp_rate_of_change
    minutes           = (cycles_remaining × 2) / 60   # assumes 2s per cycle

    < 5 min  → urgency CRITICAL
    < 15 min → urgency WARNING
    ≥ 15 min → urgency CAUTION

else:
    minutes_to_critical = None, urgency SAFE
```

## Predictive Maintenance

Computed in `run_maintenance_prediction()` in `app.py`. **Requires ≥ 5 readings**.
Uses `sklearn.linear_model.LinearRegression` for trend slopes (not the RF/LSTM models).

### Components Monitored

| Component | Trigger condition | Urgency thresholds |
|---|---|---|
| Coolant Pump | slope < 0 AND current > 0.50 | < 1 day → CRITICAL, < 3 days → WARNING, else MONITOR |
| Valve Seal | current > 5.0 OR avg trend > 0.1 | > 7.0 → CRITICAL, > 5.5 → WARNING, else MONITOR |
| Agitator Bearing | current > 0.80 OR avg trend > 0.05 | > 0.90 → WARNING, else MONITOR |

### Response Shape
```json
{
  "overall_health": 60,
  "overall_status": "WARNING",
  "overall_message": "1 component(s) need scheduled maintenance",
  "components": [ { ...per-component detail... } ],
  "next_maintenance": 2.5
}
```
`overall_health`: 30 (CRITICAL) | 60 (WARNING) | 80 (MONITOR) | 95 (HEALTHY)

Each per-component dict in `components` carries `rul_hours` (Remaining Useful Life in
hours) in addition to `days_to_maintenance` (days): `rul_hours = round(days_to_maintenance * 24)`.
The frontend `MaintenancePanel` renders `RUL ~{rul_hours} hrs`. Both fields are derived from
the linear-regression trend projection; when a component has no maintenance projection it is
simply omitted from `components`.

## AI Explainability

`POST /explain` returns **both**:
1. **Rule-based** reasons/recommendations (thresholds on the raw reading):


| Parameter | Threshold levels |
|---|---|
| temperature | > 200°C (critical), > 160°C (danger), > 135°C (warning) |
| temp_rate_of_change | > 5 (critical), > 2 (warning) |
| cooling_efficiency | < 0.30 (critical), < 0.50 (danger), < 0.70 (warning) |
| pressure | > 8 bar (critical), > 6 bar (elevated), > 4.5 bar (warning) |

2. **SHAP-based `top_drivers`** — `risk_service.shap_top_drivers()` builds the
   same `config.FEATURES` vector as scoring, runs `shap.TreeExplainer`, and
   returns the 3 features with the largest |contribution| for the predicted
   class, plus `explanation_confidence` (high if predicted-class prob > 0.7).
   `top_drivers` feeds the SMS/email alert content and is stored on alerts.

## Model Files

| File | Size | Purpose |
|---|---|---|
| `saved-models/rf_model.pkl` | ~103 KB | RandomForest classifier |
| `saved-models/lstm_model.h5` | ~460 KB | Keras LSTM (same weights as lstm_best.h5) |
| `saved-models/lstm_best.h5` | ~460 KB | Duplicate of lstm_model.h5 — not loaded by app.py |
| `saved-models/lstm_scaler.pkl` | small | MinMaxScaler for LSTM normalization |
| `saved-models/lstm_label_encoder.pkl` | small | LabelEncoder for LSTM classes |
| `saved-models/label_encoder.pkl` | small | Unused in app.py (from older pipeline) |
| `saved-models/xgb_model.pkl` | ~227 KB | XGBoost model — served by `/predict-xgb` for the Analytics model bench |

All model files are tracked via Git LFS (`.gitattributes`).
