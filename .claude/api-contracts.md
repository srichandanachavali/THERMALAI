---
module: api-contracts
scope: [backend, ml-model]
concerns: [rest-endpoints, request-shapes, response-shapes, websocket-events, auth]
last-updated: 2026-06-26
---

# ThermalAI — API Contracts

## Backend REST API (port 5000)

Auth header where required: `Authorization: Bearer <JWT>`

---

### Root / Health

**GET /**
- Auth: none
- Response: `{ message: "ThermalAI Backend Running 🔥" }`

**GET /health**
- Auth: none
- Response:
```json
{
  "status": "ok",
  "uptime": "123s",
  "ml": "ok" | "down"
}
```

---

### Auth — `/api/auth`

**POST /api/auth/login**
- Auth: none
- Request body:
```json
{ "username": "admin", "password": "admin123" }
```
- Response 200:
```json
{
  "success": true,
  "token": "<JWT>",
  "user": { "username": "admin", "name": "Plant Administrator", "role": "admin" }
}
```
- Response 401: `{ "error": "Invalid username or password" }`

**POST /api/auth/register**
- Auth: JWT + admin role required
- Request body:
```json
{ "username": "newuser", "password": "pass123", "role": "operator", "name": "Jane Doe" }
```
- Response 201:
```json
{ "success": true, "user": { "username": "newuser", "role": "operator", "name": "Jane Doe" } }
```
- Response 409: `{ "error": "Username already exists" }`
- Response 403: `{ "error": "Admin access required" }`

Default seeded users (seeded on backend startup if users collection is empty):
- `admin` / `admin123` (role: admin)
- `operator` / `op123` (role: operator)

---

### Reactors — `/api/reactors`

**GET /api/reactors**
- Auth: none
- Returns in-memory `latestReadings` object (one enriched reading per reactor)
- Response: `[ EnrichedReading, ... ]`

**GET /api/reactors/:id**
- Auth: none
- Returns single reactor from in-memory `latestReadings`
- Response 404: `{ "error": "Reactor not found" }`

**GET /api/reactors/:id/history**
- Auth: none
- Returns last 50 readings from MongoDB, sorted newest first
- Response: `[ ReactorDocument, ... ]`

**POST /api/reactors/stream**
- Auth: none
- Called by `stream_data.py` (sensor simulator) every ~2 seconds per reactor
- Request body (SensorReading):
```json
{
  "reactor_id": "A",
  "temperature": 118.5,
  "pressure": 4.0,
  "reaction_rate": 0.6,
  "cooling_efficiency": 0.89,
  "temp_rate_of_change": 0.3
}
```
- Response 200:
```json
{ "success": true, "risk_score": 42, "status": "WARNING" }
```
- Side effects:
  - Saves EnrichedReading to MongoDB
  - Emits `reactor_update` via Socket.io
  - If WARNING/CRITICAL: saves Alert, emits `new_alert`
  - If CRITICAL + SMS cooldown elapsed (5 min): sends SMS + email

**POST /api/reactors/explain**
- Auth: none
- Proxies to Flask `/explain`
- Request body: SensorReading (same shape as /stream)
- Response:
```json
{
  "success": true,
  "overall": "CAUTION — Reactor showing signs of instability",
  "reasons": ["🌡️ Temperature dangerously elevated at 165°C"],
  "recommendations": ["Increase cooling flow rate"],
  "risk_score": 55
}
```

**GET /api/reactors/:id/maintenance**
- Auth: none
- Fetches last 20 readings from MongoDB for this reactor, forwards to `/maintenance-bulk`
- Requires at least 5 readings in DB
- Response (insufficient data):
```json
{ "success": false, "message": "Building data... 3/5 readings collected" }
```
- Response (success):
```json
{
  "success": true,
  "reactor_id": "A",
  "overall_health": 80,
  "overall_status": "MONITOR",
  "overall_message": "Minor maintenance recommended",
  "components": [
    {
      "component": "Cooling System",
      "icon": "❄️",
      "current_health": 75.0,
      "trend": -0.0012,
      "days_to_maintenance": 4.2,
      "urgency": "WARNING",
      "message": "Cooling efficiency declining — schedule maintenance within 4.2 days",
      "recommendation": "Inspect cooling pump, check coolant levels, clean heat exchangers"
    }
  ],
  "next_maintenance": 4.2
}
```

---

### Simulate Runaway — `/api/simulate`

**POST /api/simulate/:id**
- Auth: none (frontend guards this behind admin role check)
- Injects a hardcoded critical reading: temp=285, pressure=9.2, reaction_rate=0.95, cooling_efficiency=0.18
- Response: `{ "success": true, "risk_score": 99.5 }`
- Side effects: emits `reactor_update` + saves Alert + emits `new_alert`

---

### Alerts — `/api/alerts`

**GET /api/alerts**
- Auth: none
- Returns last 50 alerts, newest first
- Response: `[ AlertDocument, ... ]`

**PUT /api/alerts/:id/resolve**
- Auth: none
- Sets `resolved: true` on the alert
- Response: `{ "success": true, "alert": AlertDocument }`
- Response 404: `{ "error": "Alert not found" }`

---

### Plants — `/api/plants`

Plant data is hardcoded in `backend/routes/plantRoutes.js` — no MongoDB collection.

**GET /api/plants**
- Auth: none
- Response: `[ PlantObject, ... ]`

**GET /api/plants/:id**
- Auth: none
- `:id` is `plant_id` (e.g. `PLANT_ALPHA`)
- Response 404: `{ "error": "Plant not found" }`

PlantObject shape:
```json
{
  "plant_id": "PLANT_ALPHA",
  "name": "Alpha Chemical Works",
  "location": "Patancheru Industrial Area",
  "city": "Hyderabad",
  "state": "Telangana",
  "type": "Chemical Processing",
  "reactors": ["A", "B"],
  "established": "2018"
}
```

---

## ML Flask API (port 5001)

Models are lazy-loaded on the first prediction request. `/health` can return before models load.

---

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

---

## Socket.io Events

Connection: frontend connects to `http://localhost:5000` (or `REACT_APP_API_URL` without `/api`)

| Event | Emitter | Payload |
|---|---|---|
| `reactor_update` | backend | EnrichedReading — full sensor reading with ensemble scores |
| `new_alert` | backend | Alert MongoDB document |
| `system_alert` | backend | `{ type: 'ML_DOWN' \| 'ML_RECOVERED', message: string }` |

### EnrichedReading shape (emitted on `reactor_update`)
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
  "timestamp": "2026-05-23T10:30:00.000Z"
}
```
