# ThermalAI — API Contracts

## Backend REST API (Express :5000)

### Auth

#### POST /api/auth/login
```json
Request:  { "username": "admin", "password": "admin123" }
Response: { "success": true, "token": "<jwt>", "user": { "username", "name", "role" } }
Error:    { "error": "Invalid username or password" }  (401)
```

#### POST /api/auth/register  [JWT required, admin only]
```json
Request:  { "username": "newuser", "password": "pass123", "role": "operator", "name": "John" }
Response: { "success": true, "user": { "username", "role", "name" } }
Error:    { "error": "Username already exists" }  (409)
```

---

### Reactors

#### GET /api/reactors
Returns array of latest reading per reactor (one doc per reactor_id).

#### GET /api/reactors/:id
Returns single reactor's latest reading.

#### GET /api/reactors/:id/history
Returns last 50 readings sorted ascending (for charts).
```json
[{ reactor_id, temperature, pressure, reaction_rate, cooling_efficiency,
   temp_rate_of_change, risk_score, status, timestamp, rf_score,
   lstm_score, lstm_confidence, lstm_prediction, minutes_to_critical,
   time_message, time_urgency }]
```

#### GET /api/reactors/:id/maintenance
```json
Response: {
  "success": true,
  "overall_health": 75,
  "overall_status": "WARNING",
  "overall_message": "1 component(s) need scheduled maintenance",
  "components": [{
    "component": "Cooling System",
    "icon": "❄️",
    "current_health": 60.0,
    "trend": -0.005,
    "days_to_maintenance": 3.5,
    "urgency": "WARNING",
    "message": "Cooling efficiency declining — schedule maintenance within 3.5 days",
    "recommendation": "Inspect cooling pump, check coolant levels"
  }],
  "next_maintenance": 3.5
}
```

#### POST /api/reactors/stream  [No auth — called by ML streamer]
```json
Request: {
  "reactor_id": "A",
  "temperature": 145.2,
  "pressure": 4.8,
  "reaction_rate": 0.62,
  "cooling_efficiency": 0.71,
  "temp_rate_of_change": 1.2,
  "label": "WARNING"
}
Response: {
  "reactor_id": "A", "temperature": 145.2, "pressure": 4.8,
  "reaction_rate": 0.62, "cooling_efficiency": 0.71,
  "temp_rate_of_change": 1.2, "label": "WARNING",
  "risk_score": 45.3,       // ensemble: RF*0.4 + LSTM*0.6
  "rf_score": 38.0,
  "lstm_score": 50.2,
  "lstm_confidence": 82.1,
  "lstm_prediction": "WARNING",
  "status": "WARNING",
  "minutes_to_critical": 12.5,
  "time_message": "⚠️ Estimated critical in 12.5 minutes — Act now!",
  "time_urgency": "WARNING",
  "timestamp": "2026-05-13T..."
}
```

#### POST /api/reactors/explain
```json
Request: { "reactor_id": "A", "temperature": 155, "pressure": 5.2,
           "cooling_efficiency": 0.62, "temp_rate_of_change": 1.5, "risk_score": 45 }
Response: {
  "overall": "CAUTION — Reactor showing signs of instability",
  "reasons": ["🌡️ Temperature above safe threshold at 155°C", "❄️ Cooling efficiency below normal at 62%"],
  "recommendations": ["Monitor temperature closely", "Check cooling system performance"]
}
```

---

### Alerts

#### GET /api/alerts
Returns last 50 alerts, newest first.
```json
[{ _id, reactor_id, alert_type, risk_score, temperature, pressure, message, resolved, timestamp }]
```

#### PUT /api/alerts/:id/resolve
```json
Response: { "success": true, "alert": { ...updatedAlert } }
```

---

### Plants

#### GET /api/plants
```json
[{ plant_id, name, location, city, state, type, reactors: ["A","B"], established }]
```

#### GET /api/plants/:id
Returns single plant object.

---

### Simulation

#### POST /api/simulate/:id  [No auth in current impl]
Triggers a hardcoded critical reading for reactor `:id`.
Broadcasts `reactor_update` + `new_alert` via WebSocket.
```json
Response: { "success": true, "risk_score": 99.5 }
```

---

## WebSocket Events (Socket.io :5000)

| Event | Direction | When | Payload |
|-------|-----------|------|---------|
| `reactor_update` | Server → All clients | Every stream reading | Full enriched reactor object (same as stream response) |
| `new_alert` | Server → All clients | WARNING or CRITICAL detected | Alert document from MongoDB |
| `connection` | Client → Server | Dashboard connects | (socket.id logged) |
| `disconnect` | Client → Server | Dashboard closes | (socket.id logged) |

---

## Flask ML API (Python :5001)

### POST /predict  — Random Forest
```json
Request: { "reactor_id", "temperature", "pressure", "reaction_rate",
           "cooling_efficiency", "temp_rate_of_change", "temp_rolling_avg",
           "pressure_rolling_avg", "temp_acceleration", "pressure_temp_ratio", "cooling_danger" }
Response: { "success": true, "reactor_id", "risk_score", "status", "prediction",
            "probabilities": { "safe", "warning", "critical" } }
```

### POST /predict-lstm  — LSTM Sequence
Same request shape as /predict (features only — sequence built internally from buffer).
```json
Response: { "success": true, "reactor_id", "lstm_prediction", "lstm_risk_score",
            "lstm_confidence", "lstm_probabilities": { "safe", "warning", "critical" } }
```

### POST /predict-time  — Time to Critical
```json
Request: { "reactor_id", "temperature", "temp_rate_of_change", "status" }
Response: { "success": true, "minutes_to_critical", "message", "urgency",
            "current_temp", "temp_rate_of_change", "status" }
```

### POST /explain  — Explainability
```json
Request: { "reactor_id", "temperature", "pressure", "cooling_efficiency",
           "temp_rate_of_change", "risk_score" }
Response: { "success": true, "overall", "reasons": [], "recommendations": [], "risk_score" }
```

### POST /predict-maintenance  — Single Reactor
```json
Request: { "reactor_id", "history": [{ temperature, pressure, reaction_rate,
           cooling_efficiency, temp_rate_of_change }] }
Response: { "success": true, "reactor_id", "overall_health", "overall_status",
            "components": [...], "next_maintenance" }
```

### POST /predict/batch  — Batch RF
```json
Request: { "readings": [ ...array of reading objects ] }
Response: { "predictions": [{ "reactor_id", "risk_score", "status" }] }
```
