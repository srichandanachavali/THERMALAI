# ThermalAI — Developer Guide

## Prerequisites

- **Node.js 20+** — backend + frontend
- **Python 3.11** — ML API (3.12+ not supported by TensorFlow)
- **MongoDB Atlas account** — free tier works; you need a connection string
- **Docker + Compose** — optional but recommended

## Quick Start — Docker (recommended)

```bash
git clone https://github.com/srichandanachavali/THERMALAI
cd THERMALAI
cp backend/.env.example backend/.env    # fill in values (see table below)
docker-compose up --build
```

Open **http://localhost:3000** and log in:
- `admin` / `admin123` — full access including simulate runaway
- `operator` / `op123` — monitoring only

The sensor simulator (`stream_data.py`) runs automatically inside the ml container
and sends readings every ~2 seconds for all 5 reactors.

## Quick Start — Manual

Start services **in this order** — backend calls ML on every reading.

**1. ML API (port 5001)**
```bash
cd ml-model
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

**2. Backend (port 5000)**
```bash
cd backend && npm install && cp .env.example .env && node server.js
```

**3. Frontend (port 3000)**
```bash
cd frontend && npm install && npm start
```

**4. Sensor simulator** (separate terminal)
```bash
cd ml-model && python stream_data.py
```

## Environment Variables

**Required:**

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Any random 32-char string |

**Optional** (alerts still appear in dashboard without these):

| Variable | Description |
|----------|-------------|
| `EMAIL_USER` / `EMAIL_PASS` | Gmail address + app password for alert emails |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE` | SMS alerts via Twilio |
| `ALERT_PHONE` / `OPERATOR_PHONE` / `ADMIN_PHONE` | Destination numbers for SMS |
| `ML_URL` | Defaults to `http://localhost:5001` |
| `REACT_APP_API_URL` | Defaults to `http://localhost:5000/api` (frontend only) |

## Running Tests

```bash
# Backend (Jest + supertest — mocks DB and ML, no live services needed)
cd backend && npm test

# Frontend (React Testing Library)
cd frontend && CI=true npm test

# ML model (pytest — no TensorFlow required)
cd ml-model && pytest tests/ -v
```

## Branch Workflow

```bash
git checkout develop && git pull
git checkout -b feature/your-feature-name

# work, commit, then:
git push -u origin feature/your-feature-name
# Open PR → develop. CI must pass before merge.
# develop → main is a separate PR; main auto-deploys to Render.
```

Branches: `main` (prod) · `develop` (integration) · `feature/*` · `fix/*` · `release/*`  
`main` is protected — requires 1 review + passing CI.

## Architecture Overview

Sensor readings POST to `POST /api/reactors/stream` every 2 seconds (via `stream_data.py`
or real hardware). The backend calls Flask ML endpoints in sequence — Random Forest
(`/predict`) and LSTM (`/predict-lstm`) — combining scores as `RF × 0.40 + LSTM × 0.60`
to produce a 0–100 risk score. WARNING/CRITICAL results create an Alert in MongoDB and
trigger Twilio SMS + Nodemailer email. Every reading is broadcast over Socket.io to all
connected React dashboards, which update without polling.

## ML Model Notes

**`stream_data.py`** simulates 5 reactors (A–E) through SAFE → WARNING → CRITICAL → reset
cycles, replacing real sensor hardware for development. To connect real sensors, POST the
same JSON shape to `POST /api/reactors/stream`.

**Retraining**: run `train_model.py` (RF) then `train_lstm.py` (LSTM) after updating
training data. Restart the ML service to load new weights — models are lazy-loaded once
per process. Model files (`.pkl`, `.h5`) are tracked via **Git LFS** — run
`git lfs pull` after cloning if `saved-models/` files appear as pointer stubs.

## Deployment (Render)

`render.yaml` defines three Render services (frontend static site, backend web service,
ml-model web service). On every push to `main`, GitHub Actions runs all tests then fires
Render's deploy hook via the `RENDER_DEPLOY_HOOK_URL` secret.

**Render dashboard setup:**
1. Connect the GitHub repo and import `render.yaml`
2. Set all `backend/.env` variables in the Render environment panel for the backend service
3. Set `REACT_APP_API_URL` to your Render backend URL for the frontend service
4. Set `RENDER_DEPLOY_HOOK_URL` as a GitHub Actions secret (Settings → Secrets)

**Known issue**: the ML service uses `tensorflow-cpu` (~500 MB). If the Render build
times out, upgrade to a paid instance or pin a lighter version. See `.claude/known-issues.md`.
