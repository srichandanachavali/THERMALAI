# Implementation Plan — Step-by-Step Build Sequence

## Current State
Production-grade application fully built and running. CI/CD pipeline active. Deployed to Render. 3 services (frontend, backend, ml-model) orchestrated via Docker. Real sensor integration pending.

## Phase 1: Project Setup ✅
- Monorepo structure: `frontend/`, `backend/`, `ml-model/`
- Docker + docker-compose for all 3 services with healthchecks and shared network
- GitHub Actions CI (ci.yml) running parallel test suites on every non-main push
- GitHub Actions deploy (deploy.yml) triggering Render deploy hook on main push
- Branch strategy: main (protected) → develop → feature/* / fix/*
- Git LFS for model files (*.h5, *.pkl, *.npy)

## Phase 2: Database & Schema ✅
- MongoDB Atlas cluster connected via MONGO_URI environment variable
- Mongoose models: Reactor, Alert, User, Plant
- TTL index on reactor readings (7-day expiry)
- Compound index on reactor_id + timestamp for efficient time-series queries

## Phase 3: Authentication ✅
- JWT-based auth with bcrypt password hashing
- Roles: admin and operator
- `seedDefaultUsers()` seeds default credentials on first startup
- Protected routes via middleware in Express
- Role-based conditional rendering in React frontend

## Phase 4: ML Model Training & Flask API ✅
- Random Forest Classifier trained on synthetic sensor data (`train_model.py`)
- LSTM model trained on time-series sequences (`train_lstm.py` / `train_xgboost.py`)
- Feature engineering pipeline (`feature_engineering.py`, `lstm_prepare_data.py`)
- Flask API (`ml-model/app.py`) serves `/predict` endpoint with lazy-loaded models
- Risk engine (`risk_engine.py`) implements pure scoring logic
- Sensor data simulator (`stream_data.py`) replaces real hardware

## Phase 5: Real-Time Backend ✅
- Express 5 backend with Socket.io server
- `/api/reactors/stream` endpoint: receives reading → calls ML → computes ensemble → saves to MongoDB → broadcasts `reactor_update` + `new_alert` events
- ML watchdog: pings `/health` every 30 seconds, emits `system_alert` if ML goes down
- `POST /api/simulate/:id` — admin-only synthetic critical reading injection

## Phase 6: Alert System ✅
- Alert creation on CRITICAL/WARNING readings
- Nodemailer email alerts to configured email address
- Twilio SMS alerts to operator/admin phone numbers
- Alert resolution via PUT `/api/alerts/:id/resolve`
- Resolved state persisted in MongoDB and reflected in frontend (gray/strikethrough)

## Phase 7: Frontend Dashboard ✅
- React 19 frontend with Tailwind CSS
- SocketContext providing global real-time state (reactors, alerts, mlStatus)
- Sidebar navigation, ReactorHeatmap, MetricCard panels
- RiskGauge with animated needle and SAFE/WARNING/CRITICAL color zones
- PredictionTimeline for historical risk chart
- AIComparison: RF score vs LSTM score side-by-side
- ExplainPanel: feature importance visualization
- MaintenancePanel + CountdownTimer: time-to-critical prediction
- Multi-plant support: PlantSelect → MultiPlant → ReactorDetail flow
- AlertFeed with resolve functionality
- Analytics page

## Phase 8: Testing & Edge Cases ✅
- Backend: Jest + Supertest integration tests for auth, reactors, alerts
- Frontend: React Testing Library component tests for MetricCard, RiskGauge
- ML: pytest unit tests for risk_engine (pure function, no file I/O)
- All 3 suites run in CI on every non-main push

## Phase 9: Deployment ✅ / 🔄
- Docker + docker-compose working locally for all 3 services
- Render deployment for backend and ML service
- ML service has known tensorflow-cpu issue on Render (see `.claude/known-issues.md`)
- Frontend deployed via Vercel or Render static site

## Done Criteria
- All 3 services running (docker-compose up --build)
- ML models loaded and returning risk scores
- Real-time sensor stream visible on dashboard
- SMS + email alerts firing on CRITICAL events
- CI passing (all 3 test suites green)
- All pending items resolved:
  - [ ] Render ML deployment fix (tensorflow-cpu swap)
  - [ ] Real sensor data integration replacing `stream_data.py`
  - [ ] Per-plant SMS/email contact configuration
  - [ ] ML model retraining on real plant data
