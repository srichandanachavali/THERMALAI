# ThermalAI — Dev Commands

## Start All Services (in order)

```bash
# 1. ML Flask API (must start before backend)
cd ml-model
python app.py
# Listens on :5001 — loads RF model + LSTM model at startup (~10-30s)

# 2. Express Backend (in new terminal)
cd backend
node server.js
# Listens on :5000 — connects to MongoDB Atlas, seeds default users

# 3. Data Simulator (in new terminal — optional, for live data)
cd ml-model
python stream_data.py
# Sends reactor readings to POST /api/reactors/stream every ~2s

# 4. React Frontend (in new terminal)
cd frontend
npm start
# Opens http://localhost:3000
```

## Stop All Services
- Ctrl+C in each terminal

---

## Backend Package Management

```bash
cd backend
npm install                    # install all deps
npm install <package>          # add new package
```

Key packages: express, mongoose, socket.io, axios, nodemailer, twilio, bcryptjs, jsonwebtoken, dotenv, cors

---

## Frontend Package Management

```bash
cd frontend
npm install                    # install all deps
npm start                      # dev server
npm run build                  # production build → frontend/build/
```

Key packages: react, react-router-dom, axios, socket.io-client, recharts, tailwindcss

---

## ML Model Training

```bash
cd ml-model

# Feature engineer raw data
python feature_engineering.py

# Prepare LSTM sequences from enriched data
python lstm_prepare_data.py

# Train Random Forest
python train_model.py   # → saved-models/rf_model.pkl

# Train LSTM
python train_lstm.py    # → saved-models/lstm_model.h5 + scalers

# Train XGBoost (optional / not in live ensemble)
python train_xgboost.py
```

---

## Environment Setup

```bash
# Backend .env (create if missing)
cat > backend/.env << EOF
MONGO_URI=mongodb+srv://...
PORT=5000
JWT_SECRET=thermalai_secret_key_2026
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE=+1...
ALERT_PHONE=+91...
EOF

# Frontend .env (create if missing)
echo "REACT_APP_API_URL=http://localhost:5000/api" > frontend/.env
```

---

## Test a Specific Reactor (manual)

```bash
# Send a WARNING reading for reactor A
curl -X POST http://localhost:5000/api/reactors/stream \
  -H "Content-Type: application/json" \
  -d '{
    "reactor_id": "A",
    "temperature": 155,
    "pressure": 5.5,
    "reaction_rate": 0.72,
    "cooling_efficiency": 0.63,
    "temp_rate_of_change": 2.1,
    "label": "WARNING"
  }'

# Trigger simulate runaway for reactor B
curl -X POST http://localhost:5000/api/simulate/B
```

---

## Check ML Service Health

```bash
curl http://localhost:5001/
# Response: { "status": "ThermalAI ML API Running" }
```

---

## Deployment (Render) — Pending Fix

See `.claude/known-issues.md` for the detailed render deployment fix.

Quick summary:
1. Create `ml-model/requirements-prod.txt` (stripped deps only)
2. Add `ml-model/runtime.txt` with `python-3.9.18`
3. Update `ml-model/Procfile` to use gunicorn
4. Commit saved-models/ files
5. Add `render.yaml` at root
