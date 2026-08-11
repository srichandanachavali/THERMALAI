# ThermalAI — Backend REST API (port 5000)

**Auth (v1.2.0):** every endpoint below except `POST /api/auth/login`, `GET /health`,
and `GET /` requires `Authorization: Bearer <JWT>`. `POST /api/simulate/:id` and
`POST /api/auth/register` additionally require an admin role. Middleware:
`backend/middleware/auth.js` (`verifyToken`, `adminOnly`) — full negative-test
coverage in `backend/tests/security.test.js`. See `docs/SECURITY_AUDIT.md`.

## Root / Health

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

## Auth — `/api/auth`

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

## Reactors — `/api/reactors`

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
  "reactor_id": "R-101",
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
  "reactor_id": "R-101",
  "overall_health": 80,
  "overall_status": "MONITOR",
  "overall_message": "Minor maintenance recommended",
  "components": [
    {
      "component": "Coolant Pump",
      "icon": "🔄",
      "current_health": 75.0,
      "trend": -0.0012,
      "days_to_maintenance": 4.2,
      "rul_hours": 101,
      "urgency": "WARNING",
      "message": "Cooling efficiency declining — schedule maintenance within 4.2 days",
      "recommendation": "Inspect cooling pump, check coolant levels, clean heat exchangers"
    }
  ],
  "next_maintenance": 4.2
}
```

## Simulate Runaway — `/api/simulate`

**POST /api/simulate/:id**
- Auth: none (frontend guards this behind admin role check)
- Injects a hardcoded critical reading: temp=285, pressure=9.2, reaction_rate=0.95, cooling_efficiency=0.18
- Response: `{ "success": true, "risk_score": 99.5 }`
- Side effects: emits `reactor_update` + saves Alert + emits `new_alert`

## Alerts — `/api/alerts`

**GET /api/alerts**
- Auth: none
- Returns last 50 alerts, newest first
- Response: `[ AlertDocument, ... ]`

**PUT /api/alerts/:id/resolve**
- Auth: none
- Sets `resolved: true` on the alert
- Response: `{ "success": true, "alert": AlertDocument }`
- Response 404: `{ "error": "Alert not found" }`

## Plants — `/api/plants`

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
  "reactors": ["R-101", "R-102"],
  "established": "2018"
}
```
