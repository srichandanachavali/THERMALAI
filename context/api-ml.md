# ThermalAI — ML Flask API (port 5001)

Models are lazy-loaded on the first prediction request. `/health` can return before models load.

**GET /**
- Response: `{ "message": "ThermalAI ML Service Running 🔥", "status": "ready" }`

**GET /health**
- Response: `{ "status": "ok", "models_loaded": true, "reactor_buffers": 5 }`

**POST /predict** — Random Forest
- Request: SensorReading JSON
- Response:
```json
{
  "success": true,
  "reactor_id": "R-101",
  "risk_score": 45.0,
  "status": "WARNING",
  "prediction": "WARNING",
  "probabilities": { "safe": 30.0, "warning": 50.0, "critical": 20.0 }
}
```

**POST /predict-lstm** — LSTM sequence model
- Request: SensorReading JSON (reactor_id required for buffer lookup)
- Maintains a per-reactor deque buffer of length 10; pads with the first reading until filled
- Response:
```json
{
  "success": true,
  "reactor_id": "R-101",
  "lstm_prediction": "WARNING",
  "lstm_risk_score": 52.0,
  "lstm_confidence": 68.4,
  "lstm_probabilities": { "safe": 25.0, "warning": 60.0, "critical": 15.0 }
}
```

**POST /predict-xgb** — XGBoost (advisory model bench)
- Request: SensorReading JSON
- Scores on the 10 original training features; class probs severity-weighted into `xgb_risk_score` [0,100]
- Response:
```json
{
  "success": true,
  "reactor_id": "R-101",
  "xgb_prediction": "WARNING",
  "xgb_risk_score": 44.0,
  "xgb_confidence": 63.5,
  "xgb_probabilities": { "warning": 63.5, "safe": 22.0, "critical": 14.5 }
}
```
- 500 (advisory-down) if `xgb_model.pkl` cannot be loaded; backend treats this as zeroed SAFE, never `ml_degraded`

**POST /predict-physics** — Arrhenius kinetics (advisory model bench)
- Request: SensorReading JSON (`temperature` required; `cooling_efficiency` optional; `reactor_id` optional)
- Computes `k = A·exp(-Ea/(R·T))`, `reaction_rate = clamp(0.5·k/k_design)`, `physics_risk_score = (rate-0.5)/0.5×100`
- Reactors use canonical slugs (R-101…R-301); unknown/missing IDs default to R-101
- Response:
```json
{
  "success": true,
  "reactor_id": "R-101",
  "physics_prediction": "WARNING",
  "physics_risk_score": 38.0,
  "reaction_rate": 0.69,
  "note": "Reaction rate above design nominal — monitor cooling closely."
}
```

**POST /predict/batch** — RF batch
- Request: `[ SensorReading, ... ]`
- Response: `{ "success": true, "results": [ { "reactor_id": "R-101", "risk_score": 45.0, "status": "WARNING" }, ... ] }`

**POST /predict-time** — time to critical
- Request: SensorReading + `risk_score` + `status` fields
- Response:
```json
{
  "success": true,
  "minutes_to_critical": 12.5,
  "message": "⚠️ Estimated critical in 12.5 minutes — Act now!",
  "urgency": "WARNING",
  "current_temp": 148.0,
  "temp_rate_of_change": 1.1,
  "status": "WARNING"
}
```
- `minutes_to_critical` is `null` when status is SAFE

**POST /explain** — rule-based explainability (no ML inference)
- Request: SensorReading + `risk_score`
- Response: same shape as proxied through `/api/reactors/explain`

**POST /predict-maintenance** — single-reading rolling buffer
- Maintains its own per-reactor buffer (maxlen=20) inside Flask process memory
- Request: SensorReading
- Response: same shape as `/maintenance-bulk`

**POST /maintenance-bulk** — batch maintenance from backend
- Request:
```json
{
  "reactor_id": "R-101",
  "readings": [
    { "cooling_efficiency": 0.85, "pressure": 4.2, "reaction_rate": 0.6, "temperature": 120 },
    ...
  ]
}
```
- Requires `readings.length >= 5`
- Response: see `/api/reactors/:id/maintenance` response shape above
