# ThermalAI — API Reference

**Base URL:** `http://localhost:5000` · Production: your Render backend URL

## Authentication

All protected endpoints require a JWT Bearer token:
```
Authorization: Bearer <token>
```
Obtain via `POST /api/auth/login`. Tokens expire in **24 hours**.  
Roles: `admin` (full access) · `operator` (monitoring + resolve alerts).

## Endpoints

### POST /api/auth/login
Auth: none

| Body field | Type | Required |
|------------|------|----------|
| `username` | string | yes |
| `password` | string | yes |

Response `200`: `{ "success": true, "token": "<jwt>", "user": { "username": "admin", "role": "admin", "name": "Plant Administrator" } }`  
Response `401`: `{ "error": "Invalid username or password" }`

Default credentials (seeded on startup): `admin/admin123` · `operator/op123`

### POST /api/auth/register
Auth: **admin token required**

| Body field | Type | Notes |
|------------|------|-------|
| `username` | string | required |
| `password` | string | required |
| `role` | string | `"admin"` or `"operator"` — defaults to `"operator"` |
| `name` | string | optional display name |

Response `201`: `{ "success": true, "user": { "username": "...", "role": "operator" } }`  
Response `409`: `{ "error": "Username already exists" }`

### GET /api/reactors
Auth: none. Returns latest in-memory reading per reactor (empty array on cold start).

Response `200`: array of `ReactorReading`

### GET /api/reactors/:id
Auth: none. Returns latest in-memory reading for one reactor.

Response `200`: `ReactorReading` · Response `404`: `{ "error": "Reactor not found" }`

### GET /api/reactors/:id/history
Auth: none. Last 50 readings from MongoDB, newest first.

Response `200`: array of `ReactorReading`

### POST /api/reactors/stream
Auth: none. Called by `stream_data.py` or real hardware every ~2 s per reactor.

| Body field | Type | Description |
|------------|------|-------------|
| `reactor_id` | string | `"A"` – `"E"` |
| `temperature` | number | °C |
| `pressure` | number | bar |
| `reaction_rate` | number | 0–1 |
| `cooling_efficiency` | number | 0–1 |
| `temp_rate_of_change` | number | °C per cycle |

Response `200`: `{ "success": true, "risk_score": 42, "status": "WARNING" }`  
`status`: `"SAFE"` · `"WARNING"` · `"CRITICAL"`

Side effects: saves reading to MongoDB · emits `reactor_update` · creates Alert + SMS/email on WARNING or CRITICAL.

### POST /api/reactors/explain
Auth: none. Body: same shape as `/stream`.

Response `200`:
```json
{ "success": true, "overall": "CAUTION — Reactor showing signs of instability",
  "reasons": ["🌡️ Temperature dangerously elevated at 165°C"],
  "recommendations": ["Increase cooling flow rate"], "risk_score": 55 }
```

### GET /api/reactors/:id/maintenance
Auth: none. Requires ≥ 5 readings in MongoDB.

Response `200` (building): `{ "success": false, "message": "Building data... 3/5 readings collected" }`

Response `200` (ready):
```json
{ "success": true, "overall_health": 80, "overall_status": "MONITOR",
  "overall_message": "Minor maintenance recommended", "next_maintenance": 4.2,
  "components": [{ "component": "Coolant Pump", "icon": "🔄",
    "current_health": 75.0, "days_to_maintenance": 4.2, "rul_hours": 101, "urgency": "WARNING",
    "message": "...", "recommendation": "..." }] }
```

### GET /api/alerts
Auth: none. Last 50 alerts, newest first.

Response `200`: array of `Alert`

### PUT /api/alerts/:id/resolve
Auth: none. Sets `resolved: true`.

Response `200`: `{ "success": true, "alert": Alert }` · Response `404`: `{ "error": "Alert not found" }`

### POST /api/simulate/:id
Auth: none on the endpoint — admin check is enforced in the frontend only.  
Injects a hardcoded critical reading (temp 285°C, pressure 9.2 bar) for reactor `:id`.

Response `200`: `{ "success": true, "risk_score": 99.5 }`

### GET /health
Auth: none. Used by Docker healthchecks and the backend ML watchdog.

Response `200`: `{ "status": "ok", "uptime": "42s", "ml": "ok" }`  
Response `503`: same shape with `"ml": "down"` when Flask API is unreachable.

## Data Shapes

### ReactorReading
| Field | Type | Description |
|-------|------|-------------|
| `reactor_id` | string | `"A"` – `"E"` |
| `temperature` | number | °C |
| `pressure` | number | bar |
| `reaction_rate` | number | 0–1 |
| `cooling_efficiency` | number | 0–1 |
| `temp_rate_of_change` | number | °C per cycle |
| `risk_score` | number | ensemble score 0–100 (`RF×0.40 + LSTM×0.60`) |
| `status` | string | `"SAFE"` · `"WARNING"` · `"CRITICAL"` |
| `minutes_to_critical` | number \| null | linear projection; `null` when SAFE |
| `timestamp` | ISO date | set by backend on save |

### Alert
| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | MongoDB ObjectId |
| `reactor_id` | string | which reactor triggered it |
| `alert_type` | string | `"WARNING"` · `"CRITICAL"` |
| `risk_score` | number | score at time of alert |
| `temperature` | number | °C at time of alert |
| `pressure` | number | bar at time of alert |
| `message` | string | human-readable description |
| `resolved` | boolean | `false` until `PUT /resolve` |
| `timestamp` | ISO date | |

## WebSocket (Socket.io)

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000'); // connect to root, not /api
```

| Event | Emitted when | Payload |
|-------|-------------|---------|
| `reactor_update` | Every sensor reading processed | Full `ReactorReading` |
| `new_alert` | WARNING or CRITICAL reading received | Full `Alert` |
| `system_alert` | ML service goes down or recovers | `{ type: "ML_DOWN" \| "ML_RECOVERED", message: string }` |

All events broadcast to every connected client. No rooms.

## Error Codes

| Code | Meaning | Body |
|------|---------|------|
| `400` | Missing or invalid fields | `{ "error": "..." }` |
| `401` | No token / expired / invalid | `{ "error": "No token provided" }` |
| `403` | Valid token but insufficient role | `{ "error": "Admin access required" }` |
| `404` | Resource not found | `{ "error": "... not found" }` |
| `500` | Unhandled server error | `{ "error": "..." }` — check `backend/logs/` |
