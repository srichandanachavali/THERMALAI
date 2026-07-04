# ThermalAI — System Design

**Version:** 1.1.0  
**Date:** 2026-07-04

See `context/architecture.md` for the full service topology diagram.

---

## Services

| Service | Language | Port | Framework |
|---|---|---|---|
| Frontend | JavaScript (React 19) | 3000 | Create React App, Tailwind CSS |
| Backend API | JavaScript (Node.js) | 5000 | Express 5, Socket.io, Mongoose |
| ML API | Python 3.11 | 5001 | Flask, scikit-learn, Keras/TensorFlow |
| Database | — | Atlas | MongoDB Atlas (cloud) |

## Data Flow

```
stream_data.py (sensor simulator)
  └─ POST /api/reactors/stream (every ~2s per reactor)
       └─ reactorController.streamReading()
            ├─ POST :5001/predict        → RF risk score
            ├─ POST :5001/predict-lstm   → LSTM risk score
            │   ensemble = RF×0.40 + LSTM×0.60
            ├─ POST :5001/predict-time   → minutes to critical
            ├─ Reactor.save()            → MongoDB
            ├─ io.emit('reactor_update') → all browsers
            └─ if WARNING/CRITICAL:
                 Alert.save()
                 io.emit('new_alert')
                 if CRITICAL + cooldown OK: SMS + email
```

## Key Design Decisions

- **ADR-001/002 (superseded → locked spec):** Dual RF+LSTM ensemble with 0.40/0.60 weights
- **ADR-003:** JWT in localStorage (acceptable for intranet; revisit if public-facing)
- **ADR-004:** Socket.io for true broadcast (vs SSE which is server-push only)
- **ADR-005:** MongoDB for schema flexibility as feature set evolves
- **ADR-006:** Separate Flask ML API (full Python ecosystem, independent deployability)
- **ADR-007:** Render.com for zero-DevOps deployment (known ML tier blocker)

## Watchdog

`backend/server.js` polls `GET :5001/health` every 30 seconds (timeout: 5s).
On failure: emits `system_alert { type: 'ML_DOWN' }`, saves a SYSTEM alert to MongoDB.
On recovery: emits `system_alert { type: 'ML_RECOVERED' }`.
Individual readings during ML-down carry `ml_degraded: true` (NO FALSE-SAFE FALLBACKS rule).

## Real-time Architecture

All Socket.io events broadcast to all connected clients (no room scoping):
- `reactor_update` — enriched reading with risk score and predictions
- `new_alert` — WARNING/CRITICAL alert document
- `system_alert` — ML health state changes

Frontend `SocketContext.js` maintains `reactors[]`, `alerts[]`, and `mlStatus` in global
React state. Components consume via `useSocket()` hook.
