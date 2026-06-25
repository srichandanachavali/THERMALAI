---
module: dev-commands
scope: [backend, frontend, ml-model]
concerns: [setup, start-order, testing, debugging, mongodb-queries, model-retraining, deployment]
last-updated: 2026-06-26
---

# ThermalAI — Dev Commands

## Prerequisites

- Node.js 18+
- Python 3.10–3.12 (TensorFlow compatibility; 3.13 not yet supported by tf)
- MongoDB Atlas account (connection string in backend/.env)

---

## Environment Setup (first time)

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — fill in MONGO_URI, JWT_SECRET, Twilio, Gmail values

# Frontend
cp frontend/.env.example frontend/.env
# Default value (http://localhost:5000/api) is correct for local dev
```

---

## Start Order

Services must start in this order — backend calls ML API on every reading,
and the frontend connects to the backend WebSocket on load.

### 1. ML API (port 5001)

```bash
cd ml-model
pip install -r requirements.txt   # first time only
python app.py
```

Models lazy-load on the first request — the server is ready as soon as you
see `Running on http://0.0.0.0:5001`.

### 2. Backend (port 5000)

```bash
cd backend
npm install   # first time only
node server.js
```

On startup the backend:
- Connects to MongoDB Atlas
- Runs `seedDefaultUsers()` (creates admin/operator if missing)

### 3. Frontend (port 3000)

```bash
cd frontend
npm install   # first time only
npm start
```

Browser opens automatically at `http://localhost:3000`.

### 4. Sensor Simulator

```bash
cd ml-model
python stream_data.py
```

Sends a reading for each of the 5 reactors (A–E) every ~2 seconds to
`POST http://localhost:5000/api/reactors/stream`. This replaces real hardware.

---

## Stop All Services

```bash
# Each service — Ctrl+C in its terminal window
# Or kill by port on Windows:
netstat -ano | findstr :5000
netstat -ano | findstr :5001
taskkill /PID <pid> /F
```

---

## Python Virtual Environment (recommended)

```bash
cd ml-model
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python app.py
```

`.venv/` is in `.gitignore` — never commit it.

---

## Default Login Credentials

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | admin |
| `operator` | `op123` | operator |

Seeded automatically on backend startup if users collection is empty.
To re-seed: drop the `users` collection in MongoDB Atlas and restart backend.

---

## Simulate Thermal Runaway (without stream_data.py)

```bash
# With backend running:
curl -X POST http://localhost:5000/api/simulate/A
```

Or use the "Simulate Runaway" button in the ReactorDetail page (admin role required).

---

## ML API Health Check

```bash
curl http://localhost:5001/health
# Expected: { "status": "ok", "models_loaded": true, "reactor_buffers": 5 }
```

---

## Backend Health Check

```bash
curl http://localhost:5000/health
# Expected: { "status": "ok", "uptime": "42s", "ml": "ok" }
```

---

## Useful MongoDB Queries (Atlas or mongosh)

```js
// See latest reading per reactor
db.reactors.aggregate([
  { $sort: { timestamp: -1 } },
  { $group: { _id: "$reactor_id", latest: { $first: "$$ROOT" } } }
])

// Count unresolved critical alerts
db.alerts.countDocuments({ alert_type: "CRITICAL", resolved: false })

// Clear all readings (for clean dev state)
db.reactors.deleteMany({})

// Add TTL index (7-day retention — pending improvement)
db.reactors.createIndex({ timestamp: 1 }, { expireAfterSeconds: 604800 })
```

---

## Retrain ML Models

```bash
cd ml-model

# Generate synthetic training data
python simulate_data.py

# Train Random Forest
python train_model.py

# Prepare LSTM sequences
python lstm_prepare_data.py

# Train LSTM
python train_lstm.py

# Validate
python validate_data.py
```

New model files land in `saved-models/`. Restart `app.py` to pick them up
(lazy-load only runs once per process lifetime).

---

## Production Build (Render)

```bash
# Frontend — builds static files to frontend/build/
cd frontend
npm run build

# Backend / ML — Render runs these via render.yaml
# Backend: node server.js
# ML API:  python app.py
```

See `.claude/known-issues.md` for the ML deployment blocker on Render.
