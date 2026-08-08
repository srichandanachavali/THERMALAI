# ThermalAI — Socket.io Events

Connection: frontend connects to `http://localhost:5000` (or `REACT_APP_API_URL` without `/api`)

| Event | Emitter | Payload |
|---|---|---|
| `reactor_update` | backend | EnrichedReading — full sensor reading with ensemble scores |
| `new_alert` | backend | Alert MongoDB document |
| `system_alert` | backend | `{ type: 'ML_DOWN' \| 'ML_RECOVERED', message: string }` |

## EnrichedReading shape (emitted on `reactor_update`)

```json
{
  "reactor_id": "A",
  "temperature": 148.3,
  "pressure": 5.1,
  "reaction_rate": 0.72,
  "cooling_efficiency": 0.78,
  "temp_rate_of_change": 1.2,
  "risk_score": 49,
  "rf_score": 42.0,
  "lstm_score": 53.5,
  "lstm_confidence": 71.2,
  "lstm_prediction": "WARNING",
  "status": "WARNING",
  "minutes_to_critical": 18.4,
  "time_message": "⚠️ Estimated critical in 18.4 minutes — Monitor closely",
  "time_urgency": "CAUTION",
  "ml_degraded": false,
  "timestamp": "2026-05-23T10:30:00.000Z"
}
```

`ml_degraded: true` is set when both RF and LSTM calls fail simultaneously (ML service unreachable).
A degraded reading carries `risk_score: 0 / status: SAFE` by arithmetic default — this is NOT a real
prediction. The UI must show the MLStatusBanner whenever `mlStatus === 'down'` (see App.js).
See the NO FALSE-SAFE FALLBACKS standing rule in CLAUDE.md.
