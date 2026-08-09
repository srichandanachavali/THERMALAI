---
title: ThermalAI — Service Architecture
description: Service topology, data-flow through the three services, Socket.io event bus (JWT-authenticated), ports, security middleware (helmet + CORS allow-list), and Render deployment target
modules:
  - backend/server.js
  - backend/logger.js
  - backend/connectors/opcua-connector.js
  - backend/connectors/connector-registry.js
  - frontend/src/context/SocketContext.js
tests:
  - backend/tests/reactors.test.js
  - backend/tests/security.test.js
references:
  - context/api-contracts.md
  - context/dev-commands.md
  - context/tunables.md
  - docs/SECURITY_AUDIT.md
---

# ThermalAI — Service Architecture

## Service Topology

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React 19)          port 3000                          │
│  SocketContext — persistent WebSocket to backend                │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP (axios)  +  WebSocket (socket.io-client)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  Node / Express 5            port 5000                          │
│  server.js — http.createServer + Socket.io Server               │
│  Routes: /api/reactors  /api/alerts  /api/auth  /api/plants     │
│  Simulate: POST /api/simulate/:id (inline, before other routes) │
└──────────┬──────────────────────────────────────────────────────┘
           │ axios HTTP calls (per reading)
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Flask ML API                port 5001                          │
│  app.py — lazy-loads RF + LSTM on first request                 │
│  Endpoints: /predict  /predict-lstm  /predict-time  /explain    │
│             /maintenance-bulk  /predict/batch  /health          │
└──────────────────────────────────────────────────────────────────┘
           │
           │ All three services read/write:
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  MongoDB Atlas (cloud)                                          │
│  Collections: reactors  alerts  users                           │
│  Plant data is hardcoded in plantRoutes.js — no DB collection   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow — Normal Sensor Reading

```
stream_data.py
    │  POST /api/reactors/stream  { reactor_id, temperature, pressure,
    │                               reaction_rate, cooling_efficiency,
    │                               temp_rate_of_change }
    ▼
reactorController.streamReading()
    │
    ├─► POST :5001/predict        → { risk_score, status, probabilities }  (RF)
    ├─► POST :5001/predict-lstm   → { lstm_risk_score, lstm_confidence }   (LSTM)
    │
    │   ensemble = RF_score × 0.40 + LSTM_score × 0.60
    │
    ├─► POST :5001/predict-time   → { minutes_to_critical, urgency }
    │
    ├─► Reactor.save()            → MongoDB reactors collection
    │
    ├─► if WARNING or CRITICAL:
    │       Alert.save()          → MongoDB alerts collection
    │       io.emit('new_alert')  → all connected browsers
    │       if CRITICAL + cooldown ok:
    │           sendSMSAlert()    → Twilio
    │           sendEmailAlert()  → Nodemailer / Gmail
    │
    └─► io.emit('reactor_update') → all connected browsers
```

## Data Flow — Simulate Runaway (admin only, frontend button)

```
Frontend → POST /api/simulate/:id
    │
    ├─► POST :5001/predict (hardcoded critical reading)
    ├─► Alert.save()
    ├─► io.emit('reactor_update')
    └─► io.emit('new_alert')
```

## Socket.io Event Bus

The backend attaches `io` to every request via middleware (`req.io = io`).
All events are broadcast to all connected clients (`io.emit`, not room-scoped).

| Event | Direction | Payload |
|---|---|---|
| `reactor_update` | server → clients | enriched reactor reading (see api-contracts.md) |
| `new_alert` | server → clients | Alert document |
| `system_alert` | server → clients | `{ type: 'ML_DOWN' \| 'ML_RECOVERED', message }` |

## Ports at a Glance

| Service | Port | Start command |
|---|---|---|
| React frontend | 3000 | `npm start` in `frontend/` |
| Express backend | 5000 | `node server.js` in `backend/` |
| Flask ML API | 5001 | `python app.py` in `ml-model/` |
| Sensor simulator | — | `python stream_data.py` in `ml-model/` |

## Startup Resilience (server.js)

`server.js` guards against transient Atlas outages and flaky machine DNS:

- **MongoDB connect retry** — the initial `mongoose.connect` is wrapped in
  `connectWithRetry()` (exponential backoff, capped at 30s). A failed first
  connect no longer leaves a dead buffered connection (which surfaced as
  `users.findOne() buffering timed out after 10000ms` on login); it retries
  until Mongo is reachable, then runs `seedDefaultUsers()`.
- **DNS fallback** — on machines whose configured DNS resolver intermittently
  refuses Node's SRV lookups (`querySrv ECONNREFUSED`), the backend appends
  public resolvers (`8.8.8.8`/`8.8.4.4`) to the Node resolver list at startup
  via `dns.setServers()` when they aren't already present. This unblocks
  `mongodb+srv://` Atlas SRV discovery. Harmless on healthy networks.

## Deployment Target

Platform: **Render.com** (`render.yaml` present in repo root)

| Service | Render type |
|---|---|
| Frontend | Static site (React build) |
| Backend | Web service (Node) |
| ML API | Web service (Python) — has deployment blocker, see `known-issues.md` |

Environment variables are set in Render dashboard (never committed). See
`backend/.env.example` and `frontend/.env.example` for the full list.

## CI/CD

- `.github/workflows/ci.yml` — runs on every push except `main`; 3 parallel jobs
  (backend-test, frontend-test, ml-test).
- `.github/workflows/deploy.yml` — runs on push to `main`; same 3 test jobs → deploy
  job → `curl RENDER_DEPLOY_HOOK_URL`; failure posts a commit comment.
- Deploy job requires GitHub environment `production` and secret `RENDER_DEPLOY_HOOK_URL`.

## Docker

`docker-compose up --build` starts all 4 containers: `thermalai-ml` (5001),
`thermalai-backend` (5000), `thermalai-frontend` (3000→80), `thermalai-simulator`.
Backend waits for the ML healthcheck before starting; the simulator waits for the
backend healthcheck. Backend logs mount to a named volume `backend-logs`, and it reads
`./backend/.env` via `env_file`.
