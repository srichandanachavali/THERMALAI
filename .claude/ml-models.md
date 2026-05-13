# ThermalAI — ML Models Reference

## Feature Engineering (10 features)

All 10 features are required for both RF and LSTM predictions.

| # | Name | How Computed | Range |
|---|------|-------------|-------|
| 1 | temperature | Raw sensor | °C |
| 2 | pressure | Raw sensor | bar |
| 3 | reaction_rate | Raw sensor | 0.0–1.0 |
| 4 | cooling_efficiency | Raw sensor | 0.0–1.0 |
| 5 | temp_rate_of_change | Raw sensor (°C/cycle) | any |
| 6 | temp_rolling_avg | 5-period rolling avg of temperature | °C |
| 7 | pressure_rolling_avg | 5-period rolling avg of pressure | bar |
| 8 | temp_acceleration | Rate of change of temp_rate_of_change (2nd derivative) | any |
| 9 | pressure_temp_ratio | pressure ÷ temperature | any |
| 10 | cooling_danger | (1 − cooling_efficiency) × temperature | any |

Feature engineering script: `ml-model/feature_engineering.py`

---

## Random Forest Model

- **File**: `ml-model/saved-models/rf_model.pkl`
- **Algorithm**: RandomForestClassifier(n_estimators=100, max_depth=10)
- **Input**: 10 features (flat vector)
- **Output**: Probabilities for [SAFE, WARNING, CRITICAL]
- **Risk score formula**: `(warning_prob × 50) + (critical_prob × 100)` → 0–100
- **Training**: `ml-model/train_model.py`
- **Data**: `ml-model/data/reactor_data_enriched.csv`
- **Split**: 80/20 stratified
- **Reported accuracy**: 100% on synthetic test data

### Status Thresholds (apply to ensemble score, not just RF)
| Score | Status |
|-------|--------|
| < 30 | SAFE |
| 30–69 | WARNING |
| ≥ 70 | CRITICAL |

---

## LSTM Model

- **Files**: `saved-models/lstm_model.h5`, `lstm_scaler.pkl`, `lstm_label_encoder.pkl`
- **Input shape**: (1, 10, 10) — batch=1, sequence_length=10, features=10
- **Architecture**:
  ```
  LSTM(64, return_sequences=True) → BatchNorm → Dropout(0.2)
  LSTM(32) → BatchNorm → Dropout(0.2)
  Dense(32, relu) → Dropout(0.1)
  Dense(16, relu)
  Dense(3, softmax)  →  [SAFE, WARNING, CRITICAL]
  ```
- **Training**: `ml-model/train_lstm.py`
- **Data prep**: `ml-model/lstm_prepare_data.py` → `ml-model/data/lstm/`
- **Split**: 72% train / 13% val / 15% test
- **Early stopping**: patience=10, epochs=50, batch_size=32
- **Loss**: categorical_crossentropy

### Sequence Buffer (in app.py)
```python
from collections import deque
reactor_buffers = {}  # { reactor_id: deque(maxlen=10) }
```
Each call to `/predict-lstm` appends the current reading to the reactor's buffer. LSTM only predicts once 10+ readings are available (returns RF fallback otherwise).

---

## Ensemble Logic (in reactorController.js)

```javascript
const ensembleScore = (rfScore * 0.40) + (lstmScore * 0.60);
```

RF weight 40% — better at classifying static feature patterns.
LSTM weight 60% — better at detecting temporal trends and early anomalies.

---

## Time-to-Critical (Flask /predict-time)

```python
CRITICAL_TEMP_THRESHOLD = 162  # °C

if status == 'CRITICAL':
    minutes = 0
elif status == 'WARNING' and temp_rate_of_change > 0:
    degrees_to_critical = CRITICAL_TEMP_THRESHOLD - temperature
    minutes = (degrees_to_critical / temp_rate_of_change * 2) / 60
    urgency = 'CRITICAL' if minutes < 5 else ('WARNING' if minutes < 15 else 'CAUTION')
```

---

## Explainability Thresholds (Flask /explain)

| Parameter | Safe | Elevated | Dangerous | Critical |
|-----------|------|----------|-----------|---------|
| Temperature | <135°C | 135–160°C | 160–200°C | >200°C |
| Pressure | <4.5 bar | 4.5–6 bar | 6–8 bar | >8 bar |
| Cooling efficiency | >0.7 | 0.5–0.7 | <0.3 | — |
| Temp acceleration | normal | — | >2°C/cycle | >5°C/cycle |

---

## Predictive Maintenance (Flask /predict-maintenance)

Analyzes last 50 readings per reactor using linear regression on trends.

| Component | Failure Threshold | Analysis Method |
|-----------|-------------------|----------------|
| Cooling System | efficiency < 0.50 | Linear regression on efficiency trend |
| Pressure Relief Valve | pressure > 7.0 bar | Current + trend analysis |
| Reaction Controller | rate > 0.90 | Current + trend analysis |

**Health score formula**: `100 - (distance_from_threshold / threshold × 100)`

---

## XGBoost Model

- **File**: `saved-models/xgb_model.pkl`
- **Training**: `ml-model/train_xgboost.py`
- **Status**: Trained but NOT used in live ensemble — was evaluated as alternative to RF
- **Potential**: Could replace RF or be added as 3rd ensemble member (RF 30% + LSTM 50% + XGB 20%)

---

## Retraining Workflow (for when real data arrives)

```bash
# 1. Export collected MongoDB data to CSV
python ml-model/push_to_mongo.py --export

# 2. Run feature engineering
python ml-model/feature_engineering.py

# 3. Prepare LSTM sequences
python ml-model/lstm_prepare_data.py

# 4. Retrain models
python ml-model/train_model.py      # overwrites rf_model.pkl
python ml-model/train_lstm.py       # overwrites lstm_model.h5 + scalers

# 5. Restart ML service
```

Note: `validate_data.py` can be used to QA the CSV before training.
