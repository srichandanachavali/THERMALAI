# ThermalAI

**AI-powered thermal runaway prevention for chemical and pharmaceutical plants.**

![CI](https://github.com/srichandanachavali/THERMALAI/actions/workflows/ci.yml/badge.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

ThermalAI monitors industrial reactors in real time and predicts thermal runaway **10–20 minutes before it occurs** — giving operators time to intervene instead of seconds to react. It combines a Random Forest + LSTM ensemble with a live React dashboard, Socket.io push updates, and automatic SMS/email alerting.

Built for chemical and pharmaceutical plant operators who need prediction, not just detection.

## ✨ Features

- 🔮 **Predictive ML ensemble** — RF × 0.40 + LSTM × 0.60 produces a 0–100 risk score; LSTM captures temporal acceleration that threshold alarms miss
- ⚡ **Real-time dashboard** — Socket.io pushes every reactor reading to all connected clients with no polling
- 🏭 **Multi-plant support** — 3 plants, 5 reactors (A–E), ranked by live risk score
- 🧠 **AI explainability** — per-reading natural language breakdown of why a risk score was assigned
- 🔧 **Predictive maintenance** — forecasts days-to-maintenance for 4 reactor components
- 🚨 **Instant alerting** — Twilio SMS + Nodemailer email on WARNING or CRITICAL, per-plant contacts configurable
- 🔐 **Role-based auth** — JWT-secured, `admin` (full access + simulate) and `operator` (monitor + resolve)
- 🐳 **Docker-first** — single `docker-compose up` starts all 3 services with healthchecks

## 🏗️ Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────────┐
│  React 19       │ ◄────────────────► │  Node/Express 5     │
│  Tailwind CSS   │   Socket.io push   │  Port 5000          │
│  Port 3000      │                    │  JWT · Winston      │
└─────────────────┘                    └──────────┬──────────┘
                                                  │ HTTP
                                       ┌──────────▼──────────┐
                                       │  Flask ML API        │
                                       │  Port 5001           │
                                       │  Random Forest+LSTM  │
                                       └──────────┬──────────┘
                                                  │
                                       ┌──────────▼──────────┐
                                       │  MongoDB Atlas       │
                                       │  7-day TTL · Atlas  │
                                       └─────────────────────┘
```

Sensor readings arrive every ~2 s via `stream_data.py` (or real hardware). The backend calls RF then LSTM, combines scores, saves to MongoDB, and broadcasts over Socket.io.

## 🚀 Quick Start

```bash
git clone https://github.com/srichandanachavali/THERMALAI
cd THERMALAI
cp backend/.env.example backend/.env   # fill in MONGO_URI + JWT_SECRET
docker-compose up --build
```

Open **http://localhost:3000**. The sensor simulator starts automatically. See [DEVELOPMENT.md](DEVELOPMENT.md) for manual setup and all environment variables.

## 📊 ML Model

| | Random Forest | LSTM |
|---|---|---|
| **Weight** | 0.40 | 0.60 |
| **Strength** | Snapshot anomalies | Temporal acceleration |
| **Input** | 10 engineered features | Sliding window (10 readings) |

**Features:** `temperature`, `pressure`, `reaction_rate`, `cooling_efficiency`, `temp_rate_of_change` + derived: `temp_rolling_avg`, `pressure_rolling_avg`, `temp_acceleration`, `pressure_temp_ratio`, `cooling_danger`

**Thresholds:** SAFE < 30 · WARNING 30–69 · CRITICAL ≥ 70. LSTM is weighted higher because thermal runaway is a temporal process — rising acceleration matters more than instantaneous values.

## 🔐 Default Credentials

> ⚠️ Development only — change before any real deployment.

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Full access + simulate runaway |
| `operator` | `op123` | Monitor + resolve alerts |

## 🌐 Deployment

[`render.yaml`](render.yaml) defines 3 Render services. Push to `main` → CI (3 parallel test suites) → Render deploy hook via GitHub Actions.

> **Known issue:** `tensorflow-cpu` (~450 MB) times out on Render free tier. Upgrade the ML service to a paid instance. See [`.claude/known-issues.md`](.claude/known-issues.md).

## 📁 Project Structure

```
THERMALAI/
├── frontend/          # React 19 + Tailwind dashboard (port 3000)
├── backend/           # Express API + Socket.io (port 5000)
│   ├── controllers/   # reactorController, alertController, authController
│   ├── models/        # Reactor, Alert, User
│   └── tests/         # Jest + supertest
├── ml-model/          # Flask ML API (port 5001)
│   ├── app.py         # Prediction endpoints
│   ├── risk_engine.py # Pure RF scoring logic
│   └── tests/         # pytest (no TensorFlow required)
├── .claude/           # AI assistant context files
├── .github/workflows/ # ci.yml + deploy.yml
├── docker-compose.yml
└── render.yaml
```

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — branch naming, conventional commits, PR checklist.

## 📄 License

MIT

## Last Updated

2026-07-02
