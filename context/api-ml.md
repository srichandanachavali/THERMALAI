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
  "reactor_id": "A",
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
  "reactor_id": "A",
  "lstm_prediction": "WARNING",
  "lstm_risk_score": 52.0,
  "lstm_confidence": 68.4,
  "lstm_probabilities": { "safe": 25.0, "warning": 60.0, "critical": 15.0 }
}
```

**POST /predict/batch** — RF batch
- Request: `[ SensorReading, ... ]`
- Response: `{ "success": true, "results": [ { "reactor_id": "A", "risk_score": 45.0, "status": "WARNING" }, ... ] }`

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
  "reactor_id": "A",
  "readings": [
    { "cooling_efficiency": 0.85, "pressure": 4.2, "reaction_rate": 0.6, "temperature": 120 },
    ...
  ]
}
```
- Requires `readings.length >= 5`
- Response: see `/api/reactors/:id/maintenance` response shape above
