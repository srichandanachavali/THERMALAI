# PRD — Product Requirements Document

## App Name
ThermalAI

## Tagline
AI-powered thermal runaway prevention platform that predicts dangerous reactor conditions 10–20 minutes before they occur.

## Problem
Industrial chemical and pharmaceutical plants face catastrophic risk from thermal runaway events in reactors — sudden, uncontrolled exothermic reactions that can cause explosions, fires, and fatalities. Current monitoring systems are reactive, alerting operators only after a dangerous condition has already developed. There is no widely available tool that predicts failures in advance and explains the risk in plain language so operators can act early.

## Target User
**Primary:** Plant operators and safety engineers at chemical/pharmaceutical manufacturing facilities who monitor reactor conditions in real time. They need fast, interpretable risk scores without needing ML expertise.  
**Secondary:** Plant safety managers and administrators who oversee multiple facilities and need consolidated alerting, audit trails, and the ability to simulate failure scenarios for training purposes.

## Core Features (Must Have)
- Real-time reactor sensor monitoring via WebSocket (Socket.io) — pushes every update to all dashboards instantly
- Dual ML ensemble prediction: Random Forest (40%) + LSTM (60%) for risk scoring 0–100
- AI explainability panel showing which sensor features drove the risk score
- Predictive maintenance panel with time-to-critical countdown
- Alert center with CRITICAL / WARNING / SAFE classification, resolve button, and resolved visual state
- SMS notifications via Twilio and email notifications via Nodemailer to configured operators
- Admin-only simulate runaway button to test system response with synthetic critical readings
- Multi-plant support: 3 plants, 5 reactors across all plants
- JWT-based authentication with role-based access (admin / operator)
- MongoDB TTL index on reactor readings (7-day retention)
- ML watchdog: broadcasts `ML_DOWN` / `ML_RECOVERED` system alerts when Flask ML API is unreachable
- Docker + docker-compose orchestration for all 3 services (frontend, backend, ml-model)
- CI/CD pipeline: GitHub Actions runs all 3 test suites on every push; deploys to Render on main

## Nice to Have
- Per-plant SMS/email contact configuration (currently hardcoded to single numbers)
- Real industrial sensor hardware integration (currently uses `stream_data.py` simulator)
- ML model retraining pipeline on real production data
- Historical trend analysis dashboard per reactor
- PDF incident report export from alert center
- Mobile-responsive operator interface

## Out of Scope
- Hardware sensor installation or PLC integration (post-production)
- Multi-tenant SaaS billing or subscription management
- SCADA or DCS system integration in this version
- Predictive maintenance scheduling calendar

## User Stories
- As an **operator**, I want to see live risk scores for all reactors on a single dashboard so that I can monitor multiple reactors simultaneously without switching screens.
- As an **operator**, I want to receive an SMS and email alert the moment a reactor enters WARNING or CRITICAL status so that I can respond immediately even when away from the dashboard.
- As an **admin**, I want to trigger a simulated thermal runaway on a test reactor so that I can verify the alert pipeline and train operators on the emergency response flow.
- As a **safety engineer**, I want to see which sensor features (temperature, pressure, cooling efficiency) contributed most to a high risk score so that I can understand the physical cause of the prediction.
- As a **plant manager**, I want to view the historical alert log for a reactor and mark resolved alerts so that I can maintain an accurate incident record.
- As an **operator**, I want to be informed immediately when the ML prediction service goes offline so that I know risk scores may be degraded.

## Success Metrics
- Mean time between alert and operator acknowledgement < 2 minutes
- Risk score prediction lead time of 10–20 minutes before actual runaway event
- Alert false positive rate < 5% on real sensor data
- System uptime > 99.5% (excluding planned maintenance)
- All 3 test suites (Jest, React Testing Library, pytest) pass on every CI run
