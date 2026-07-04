# ThermalAI — ML Architecture

**Version:** 1.1.0  
**Date:** 2026-07-04

> For locked spec: `docs/design/ensemble_locked_spec.md`  
> For full feature/inference detail: `context/ml-models.md`

---

## Two-Model Ensemble

ThermalAI uses two complementary models to detect both sudden anomalies and slow-burn
temporal drift. See `docs/design/ensemble_locked_spec.md` for locked clauses.

### Random Forest (RF)

- **File:** `ml-model/saved-models/rf_model.pkl` (sklearn RandomForestClassifier)
- **Input:** Single 10-feature vector (snapshot)
- **Output:** `risk_score` 0–100, `status` SAFE/WARNING/CRITICAL, `probabilities`
- **Score formula:** `(warning_prob × 50) + (critical_prob × 100)`, clamped to [0, 100]
- **Strength:** Fast, interpretable, handles sudden threshold crossings

### LSTM

- **File:** `ml-model/saved-models/lstm_model.h5` (Keras Sequential)
- **Input:** Sliding window of last 10 readings per reactor (shape: 10×10)
- **Output:** `lstm_risk_score` 0–100, `lstm_confidence`, `lstm_prediction`
- **Cold start:** Buffer pre-filled with first reading until 10 distinct readings accumulate
- **Strength:** Temporal pattern detection — slow temperature climb is the primary runaway precursor

### Ensemble

```
risk_score = round( RF_score × 0.40 + LSTM_score × 0.60 )
```

Computed in `backend/controllers/reactorController.js` after both model responses arrive.
LSTM weighted higher because thermal runaway is a temporal process.

---

## Feature Set (10 features)

| # | Feature | Source |
|---|---|---|
| 1 | temperature | sensor (°C) |
| 2 | pressure | sensor (bar) |
| 3 | reaction_rate | sensor (0–1) |
| 4 | cooling_efficiency | sensor (0–1) |
| 5 | temp_rate_of_change | sensor/computed |
| 6 | temp_rolling_avg | defaults to temperature |
| 7 | pressure_rolling_avg | defaults to pressure |
| 8 | temp_acceleration | defaults to 0 |
| 9 | pressure_temp_ratio | derived: pressure / temperature |
| 10 | cooling_danger | derived: (1 − cooling_efficiency) × temperature |

Features 9 and 10 are always recomputed by Flask — never trusted from the incoming payload.

---

## Time-to-Critical

Linear projection in `POST /predict-time` (not ML — no model file):

```
CRITICAL_TEMP = 162°C
degrees_remaining = 162 - current_temp
cycles_remaining  = degrees_remaining / temp_rate_of_change
minutes           = (cycles_remaining × 2s) / 60
```

Urgency: CRITICAL (<5 min), WARNING (<15 min), CAUTION (≥15 min), SAFE (not applicable).

---

## Predictive Maintenance

`POST /maintenance-bulk` runs `sklearn.linear_model.LinearRegression` on a window of
≥5 readings to compute trends for:
- Cooling System (cooling_efficiency slope)
- Pressure Relief Valve (pressure trend)
- Reaction Controller (reaction_rate trend)

---

## Model Files

| File | Size | Purpose |
|---|---|---|
| `saved-models/rf_model.pkl` | ~103 KB | Production RF classifier |
| `saved-models/lstm_model.h5` | ~460 KB | Production LSTM |
| `saved-models/lstm_scaler.pkl` | small | MinMaxScaler for LSTM input |
| `saved-models/lstm_label_encoder.pkl` | small | LabelEncoder for LSTM output |
| `saved-models/xgb_model.pkl` | ~227 KB | Trained but not used in production |
| `saved-models/lstm_best.h5` | ~460 KB | Training artifact — duplicate, not loaded |

All tracked via Git LFS.

---

## Retraining

```bash
cd ml-model
python simulate_data.py    # generate synthetic training data
python train_model.py      # train Random Forest
python lstm_prepare_data.py
python train_lstm.py       # train LSTM
python validate_data.py    # validate outputs
```

New model files land in `saved-models/`. Restart `app.py` to pick them up (lazy-load
runs once per process lifetime).
