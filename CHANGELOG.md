# Changelog

All notable changes to ThermalAI are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Planned
- Docker + docker-compose for all 3 services
- GitHub Actions CI/CD pipeline (ci.yml + deploy.yml)
- Jest/supertest backend test suite
- React Testing Library frontend test suite
- pytest ML model test suite
- Winston structured logging (replace console.*)
- MongoDB TTL index on reactor readings (7-day retention)
- Real sensor hardware integration (replace stream_data.py)
- Per-plant SMS/email contact configuration

## [1.0.0] — 2026-05-23

### Added
- Real-time reactor monitoring via WebSocket (Socket.io)
- Dual ML ensemble: Random Forest × 0.40 + LSTM × 0.60, producing 0–100 risk score
- Status thresholds: SAFE < 30, WARNING 30–69, CRITICAL ≥ 70
- Linear time-to-critical projection displayed per reactor
- AI explainability panel — per-reading natural language breakdown
- Predictive maintenance forecasting (Cooling System, Pressure Vessel, Heat Exchanger, Control System)
- Alert center with resolve functionality and visual resolved state
- SMS alerts via Twilio on WARNING/CRITICAL readings
- Email alerts via Nodemailer on WARNING/CRITICAL readings
- Database-backed authentication (MongoDB + bcrypt + JWT, 24h expiry)
- Role-based access control: `admin` and `operator` roles
- Admin-only thermal runaway simulation endpoint
- Multi-plant support: 3 plants, 5 reactors (A–E)
- Sensor simulator (`stream_data.py`) cycling SAFE → WARNING → CRITICAL → reset
- MongoDB Atlas persistence with reactor reading history
- React 19 dashboard with real-time Socket.io updates (no polling)
