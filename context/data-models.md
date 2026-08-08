---
title: ThermalAI — Data Models
description: MongoDB schemas (Reactor, Alert, User), TTL and compound indexes, and JWT payload structure
modules:
  - backend/models/Reactor.js
  - backend/models/Alert.js
  - backend/models/User.js
tests:
  - backend/tests/reactors.test.js
  - backend/tests/alerts.test.js
  - backend/tests/auth.test.js
references:
  - context/architecture.md
  - context/api-contracts.md
---

# ThermalAI — Data Models

## MongoDB Collections

Database: MongoDB Atlas (connection string in `backend/.env` → `MONGO_URI`)
ORM: Mongoose (CommonJS `require` throughout backend)

---

## Reactor

**File**: `backend/models/Reactor.js`
**Collection**: `reactors`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `reactor_id` | String | yes | — | e.g. `"A"`, `"B"`, ... `"E"` |
| `temperature` | Number | yes | — | °C |
| `pressure` | Number | yes | — | bar |
| `reaction_rate` | Number | yes | — | 0.0–1.0 |
| `cooling_efficiency` | Number | yes | — | 0.0–1.0 |
| `temp_rate_of_change` | Number | no | `0` | °C per 2-second cycle |
| `risk_score` | Number | no | `0` | ensemble score 0–100 |
| `status` | String (enum) | no | `"SAFE"` | `"SAFE"` \| `"WARNING"` \| `"CRITICAL"` |
| `predicted_temp` | Number | no | `null` | simulator predicted temperature (°C) |
| `runaway_risk` | Number | no | `0` | simulator runaway risk 0–100 |
| `sensor_fault_suspected` | Boolean | no | `false` | sim vs sensor temp deviation > 15°C |
| `timestamp` | Date | no | `Date.now` | set by backend on save |

**Note**: The enriched reading emitted via `reactor_update` Socket.io also carries
`rf_score`, `lstm_score`, `lstm_confidence`, `lstm_prediction`, `minutes_to_critical`,
`time_message`, and `time_urgency`, but **these extra fields are not saved to MongoDB** —
the Mongoose schema does not include them and strict mode will drop them on save.

**TTL index** (applied in production): `{ timestamp: 1 }` with `expireAfterSeconds: 604800` (7 days).
**Compound index** (applied): `{ reactor_id: 1, timestamp: -1 }` for history queries.

---

## Alert

**File**: `backend/models/Alert.js`
**Collection**: `alerts`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `reactor_id` | String | yes | — | matches Reactor.reactor_id |
| `alert_type` | String (enum) | yes | — | `"WARNING"` \| `"CRITICAL"` |
| `risk_score` | Number | yes | — | ensemble score at time of alert |
| `temperature` | Number | yes | — | °C at time of alert |
| `pressure` | Number | yes | — | bar at time of alert |
| `message` | String | yes | — | human-readable description |
| `resolved` | Boolean | no | `false` | set to `true` via PUT /api/alerts/:id/resolve |
| `timestamp` | Date | no | `Date.now` | — |

Alerts are created in two places:
1. `reactorController.streamReading()` — when ensemble status is WARNING or CRITICAL
2. `server.js` POST `/api/simulate/:id` — always CRITICAL

SMS + email are only sent for CRITICAL alerts with a 5-minute per-reactor cooldown
(`global.smsCooldown` in-memory dict — resets on backend restart).

---

## User

**File**: `backend/models/User.js`
**Collection**: `users`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `username` | String | yes | — | unique index |
| `password` | String | yes | — | bcrypt hashed (cost 10) via `pre('save')` hook |
| `role` | String (enum) | no | `"operator"` | `"operator"` \| `"admin"` |
| `name` | String | no | — | display name |
| `createdAt` | Date | no | `Date.now` | — |

**Instance method**: `user.comparePassword(candidate)` → `Promise<boolean>` (bcrypt.compare)

**Seeded users** (via `seedDefaultUsers()` in `authController.js`, runs on every backend startup):
- `admin` / `admin123` — role: `admin`, name: `"Plant Administrator"`
- `operator` / `op123` — role: `operator`, name: `"Plant Operator"`

Seeding only creates the user if missing or if the password is not bcrypt-hashed.
A stale `phone_1` index is dropped on startup (legacy schema cleanup).

**JWT payload** (signed with `JWT_SECRET`, 24h expiry):
```json
{ "username": "admin", "role": "admin", "name": "Plant Administrator" }
```

Token is stored in `localStorage` under key `thermalai_token`.

---

## Plant

**No MongoDB collection.** Plant data is hardcoded in `backend/routes/plantRoutes.js`.

Shape of each plant object:

| Field | Type | Notes |
|---|---|---|
| `plant_id` | String | e.g. `"PLANT_ALPHA"` — used as URL param |
| `name` | String | display name |
| `location` | String | area within city |
| `city` | String | — |
| `state` | String | — |
| `type` | String | e.g. `"Chemical Processing"` |
| `reactors` | String[] | reactor IDs belonging to this plant |
| `established` | String | year as string |

**Three hardcoded plants:**

| plant_id | name | city | reactors |
|---|---|---|---|
| `PLANT_ALPHA` | Alpha Chemical Works | Hyderabad | `["A", "B"]` |
| `PLANT_BETA` | Beta Pharma Industries | Mumbai | `["C", "D"]` |
| `PLANT_GAMMA` | Gamma Refinery Ltd | Chennai | `["E"]` |

**5 reactors total**: A, B, C, D, E — these IDs are the `reactor_id` values
used in Reactor and Alert documents, and in the Socket.io payloads.
