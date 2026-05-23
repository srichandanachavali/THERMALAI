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

## Deployment Target

Platform: **Render.com** (`render.yaml` present in repo root)

| Service | Render type |
|---|---|
| Frontend | Static site (React build) |
| Backend | Web service (Node) |
| ML API | Web service (Python) — has deployment blocker, see `known-issues.md` |

Environment variables are set in Render dashboard (never committed). See
`backend/.env.example` and `frontend/.env.example` for the full list.
