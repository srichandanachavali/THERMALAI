---
title: ThermalAI — ML Models
description: RF+LSTM ensemble formula, feature engineering, time-to-critical projection, predictive maintenance, and explainability logic
modules:
  - ml-model/app.py
  - ml-model/risk_engine.py
  - ml-model/train_model.py
  - ml-model/train_xgboost.py
  - ml-model/train_lstm.py
  - ml-model/lstm_prepare_data.py
  - ml-model/feature_engineering.py
  - ml-model/predictive_maintenance.py
  - ml-model/validate_data.py
tests:
  - ml-model/tests/test_risk_engine.py
references:
  - context/api-contracts.md
  - docs/design/ensemble_locked_spec.md
---

# ThermalAI — ML Models

## Feature Set (10 features, same for RF and LSTM)

| # | Feature | Source | Notes |
|---|---|---|---|
| 1 | `temperature` | sensor | °C, raw reading |
| 2 | `pressure` | sensor | bar, raw reading |
| 3 | `reaction_rate` | sensor | 0.0–1.0 |
| 4 | `cooling_efficiency` | sensor | 0.0–1.0 |
| 5 | `temp_rate_of_change` | sensor/computed | °C per cycle |
| 6 | `temp_rolling_avg` | sensor/computed | defaults to `temperature` if not provided |
| 7 | `pressure_rolling_avg` | sensor/computed | defaults to `pressure` if not provided |
| 8 | `temp_acceleration` | computed | defaults to 0 if not provided |
| 9 | `pressure_temp_ratio` | derived | `round(pressure / temperature, 4)` |
| 10 | `cooling_danger` | derived | `round((1 - cooling_efficiency) * temperature, 2)` |

Features 9 and 10 are always computed fresh from the raw reading in `app.py` —
they are never trusted from the incoming payload.

## Random Forest Model

- **File**: `ml-model/saved-models/rf_model.pkl` (sklearn RandomForestClassifier)
- **Classes**: `SAFE`, `WARNING`, `CRITICAL`
- **Inference** (`calculate_risk_score` in `app.py`):
  1. Build feature dict from reading, compute derived features
  2. `model.predict(df)` → predicted class label
  3. `model.predict_proba(df)` → probabilities per class
  4. `risk_score = (warning_prob × 50) + (critical_prob × 100)`, clamped to [0, 100]
  5. Status thresholds: < 30 → SAFE, < 70 → WARNING, ≥ 70 → CRITICAL
- **Endpoint**: `POST /predict`

## LSTM Model

- **File**: `ml-model/saved-models/lstm_model.h5` (Keras Sequential)
- **Scaler**: `ml-model/saved-models/lstm_scaler.pkl` (MinMaxScaler)
- **Label encoder**: `ml-model/saved-models/lstm_label_encoder.pkl`
- **Sequence length**: `SEQUENCE_LENGTH = 10`
- **Per-reactor buffer**: `reactor_buffers` — `dict[reactor_id → deque(maxlen=10)]`

### Buffer Initialization
When a new `reactor_id` is first seen, the deque is pre-filled with 10 copies of
the current feature vector (cold-start padding). Each subsequent reading appends
to the deque, dropping the oldest.

### LSTM Inference (`predict_lstm` in `app.py`)
1. Build the same 10-feature vector as RF
2. Append to reactor's deque
3. Stack deque → numpy array shape `(10, 10)`
4. `lstm_scaler.transform(sequence)` → normalized
5. Reshape to `(1, 10, 10)` for Keras
6. `lstm_model.predict(sequence_input)` → softmax probabilities per class
7. `lstm_risk_score = (warning_prob × 50) + (critical_prob × 100)`
8. Returns `lstm_prediction`, `lstm_risk_score`, `lstm_confidence` (max probability × 100)
- **Endpoint**: `POST /predict-lstm`

## Ensemble Formula

Computed in `backend/controllers/reactorController.js` after both model responses return:

```
ensemble_score = round( RF_score × 0.40 + LSTM_score × 0.60 )

SAFE     → ensemble_score < 30
WARNING  → ensemble_score 30–69
CRITICAL → ensemble_score ≥ 70
```

The backend handles ML unavailability gracefully: if either model call fails,
its score defaults to 0 and the other model's score still contributes.

## Time-to-Critical Prediction

Computed in Flask `POST /predict-time`. Uses a linear projection — no ML model.

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
| Cooling System | slope < 0 AND current > 0.50 | < 1 day → CRITICAL, < 3 days → WARNING, else MONITOR |
| Pressure Relief Valve | current > 5.0 OR avg trend > 0.1 | > 7.0 → CRITICAL, > 5.5 → WARNING, else MONITOR |
| Reaction Controller | current > 0.80 OR avg trend > 0.05 | > 0.90 → WARNING, else MONITOR |

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

## AI Explainability

`POST /explain` is **rule-based** — it does not call RF or LSTM. It evaluates
thresholds directly on the raw reading to generate human-readable reasons and
recommendations:

| Parameter | Threshold levels |
|---|---|
| temperature | > 200°C (critical), > 160°C (danger), > 135°C (warning) |
| temp_rate_of_change | > 5 (critical), > 2 (warning) |
| cooling_efficiency | < 0.30 (critical), < 0.50 (danger), < 0.70 (warning) |
| pressure | > 8 bar (critical), > 6 bar (elevated), > 4.5 bar (warning) |

## Model Files

| File | Size | Purpose |
|---|---|---|
| `saved-models/rf_model.pkl` | ~103 KB | RandomForest classifier |
| `saved-models/lstm_model.h5` | ~460 KB | Keras LSTM (same weights as lstm_best.h5) |
| `saved-models/lstm_best.h5` | ~460 KB | Duplicate of lstm_model.h5 — not loaded by app.py |
| `saved-models/lstm_scaler.pkl` | small | MinMaxScaler for LSTM normalization |
| `saved-models/lstm_label_encoder.pkl` | small | LabelEncoder for LSTM classes |
| `saved-models/label_encoder.pkl` | small | Unused in app.py (from older pipeline) |
| `saved-models/xgb_model.pkl` | ~227 KB | XGBoost model — trained but not used in production |

All model files are tracked via Git LFS (`.gitattributes`).
