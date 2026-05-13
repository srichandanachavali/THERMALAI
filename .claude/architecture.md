# ThermalAI — System Architecture

## Service Topology

```
Browser (React :3000)
    │
    ├── HTTP (axios)        →  Express Backend (:5000)
    └── WebSocket (Socket.io) ↔ Express Backend (:5000)
                                    │
                                    ├── HTTP (axios)  →  Flask ML API (:5001)
                                    └── Mongoose      →  MongoDB Atlas (cloud)
                                                              ↑
                                              Python stream_data.py
                                              (simulates sensor readings)
```

## Data Flow — Per Reactor Update

```
stream_data.py
  └─ POST /api/reactors/stream
        └─ reactorController.js: streamReactor()
              ├─ POST http://localhost:5001/predict        → RF risk score
              ├─ POST http://localhost:5001/predict-lstm   → LSTM score + confidence
              ├─ Ensemble: risk = RF*0.40 + LSTM*0.60
              ├─ POST http://localhost:5001/predict-time   → minutes_to_critical
              ├─ Save enriched reading → MongoDB: reactors
              ├─ io.emit('reactor_update', enrichedReading)
              └─ If WARNING or CRITICAL:
                    ├─ Create Alert → MongoDB: alerts
                    ├─ io.emit('new_alert', alert)
                    ├─ sendEmailAlert() via Nodemailer/Gmail
                    └─ If CRITICAL + cooldown expired (5min):
                          sendSMSAlert() via Twilio
```

## Frontend State Flow

```
SocketContext.js (React Context)
  ├─ Connects to ws://localhost:5000
  ├─ Listens: 'reactor_update' → setReactors() (replace/add by reactor_id)
  ├─ Listens: 'new_alert'      → setAlerts() (prepend, keep last 50)
  └─ Exposes: { reactors, alerts } to all child components

App.js
  └─ SocketProvider wraps all routes
        ├─ PlantSelect  (/)        — no auth required
        ├─ Login        (/login)   — no auth required
        ├─ Home         (/)        — reads reactors from SocketContext
        ├─ ReactorDetail (/reactor/:id)
        ├─ Alerts        (/alerts)
        ├─ Analytics     (/analytics/:id)
        └─ MultiPlant    (/multi-plant)
```

## Ports Summary

| Service | Port | Start Command |
|---------|------|---------------|
| React Frontend | 3000 | `cd frontend && npm start` |
| Express Backend | 5000 | `cd backend && node server.js` |
| Flask ML API | 5001 | `cd ml-model && python app.py` |
| Data Simulator | — | `cd ml-model && python stream_data.py` |
| MongoDB | cloud | Atlas (always on) |

## Alert Cooldown State

Stored in-memory in `reactorController.js`:
```javascript
const lastSMSTime = {};  // { reactor_id: timestamp }
// Only sends SMS if now - lastSMSTime[id] > 5 minutes
```
**Not shared across instances** — requires Redis if running multiple backend nodes.

## LSTM Sequence Buffer

Stored in-memory in `ml-model/app.py`:
```python
reactor_buffers = {}  # { reactor_id: deque(maxlen=10) }
# Each prediction appends to buffer; LSTM uses last 10 readings as sequence
```
**Not shared across instances** — requires Redis or sticky sessions for multi-instance.
