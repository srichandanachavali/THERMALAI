# THERMALAI: Real-Time Industrial Reactor Safety & Predictive Intelligence Platform

**THERMALAI** is an enterprise-grade industrial telemetry, safety integrity, and predictive maintenance monitoring platform designed specifically for chemical and process reactors.

By fusing **first-principles Arrhenius chemical kinetics** with **continuous state estimation (Kalman Filtering)** and a **hybrid ML ensemble (XGBoost + LSTM)**, THERMALAI predicts thermal runaway risks and equipment degradation before critical safety thresholds are breached.

---

## 🌟 Key Features & Innovations

* **Hybrid Physics + AI Ensemble:** Combines reaction kinetics simulation (nitration, hydrogenation) with Kalman state estimation, XGBoost, and LSTM sequence models to accurately calculate thermal runaway probability.


* **Real-Time Telemetry & Socket Streaming:** Live WebSocket pipeline delivering real-time telemetry for reactor temperature, jacket coolant flow, pressure, and agitator speed.


* **Safety Integrity Level (SIL) Dynamic Banding:** Automated mapping of live reactor telemetry to SIL risk bands with instant alert generation and threshold warnings.


* **Alarm Rationalization & Multi-Sensor Voting:** Cross-checks noisy or degraded sensor feeds using multi-sensor voting logic to suppress false alarms and eliminate operator alarm fatigue.


* **Explainable AI (SHAP Integration):** Provides operators with live SHAP (SHapley Additive exPlanations) attribution panels showing exactly which sensor variables are contributing to elevated risk scores.


* **High-Performance Industrial HMI:** UI tailored to High-Performance Human-Machine Interface (HMI) standards (resembling Honeywell / Yokogawa DCS panels).


* **Predictive Maintenance & RUL:** RUL (Remaining Useful Life) estimation and component health scoring to automate maintenance interval scheduling.


* **Edge Agent & OPC-UA Integration:** Edge protocol bridges supporting register maps for OPC-UA and Modbus hardware connectivity.


* **Privacy-Preserving Federated Learning:** Infrastructure for local model training and federated weight aggregation across multiple plant instances.



---

## 🏗 System Architecture

```text
               +----------------------------------+
               |   Edge Agent / Protocol Bridge   |
               |     (OPC-UA / Modbus / PLCs)     |
               +----------------+-----------------+
                                |
                                v
               +----------------+-----------------+
               |        Express.js Backend        |
               |  (Socket.io / REST / Auth / DB)  |
               +-------+------------------+-------+
                       |                  |
           WebSocket / |                  | REST / gRPC
               HTTP    |                  |
                       v                  v
+----------------------+--+    +----------+-----------------+
|   React Frontend HMI    |    |  Python ML & Physics Engine|
| (High-Perf DCS Displays)|    | (Risk Engine / SHAP / RUL)|
+-------------------------+    +----------------------------+

```

---

## 📂 Repository Structure

```text
THERMALAI/
├── backend/            # Node.js/Express REST API, WebSockets, & connectors[cite: 1]
│   ├── config/         # OPC-UA & system configuration[cite: 1]
│   ├── connectors/     # OPC-UA protocol drivers & connector registry[cite: 1]
│   ├── controllers/    # Reactors, alerts, audit, & maintenance controllers[cite: 1]
│   ├── models/         # MongoDB Mongoose schemas (User, Reactor, Alert, etc.)[cite: 1]
│   ├── services/       # Alert pipelines, ML gateway, & onboarding[cite: 1]
│   └── utils/          # Alarm rationalization & SIL banding logic[cite: 1]
├── frontend/           # React dashboard & High-Performance HMI components[cite: 1]
│   └── src/
│       ├── components/ # HMI displays, Risk Gauge, ExplainPanel, Charts[cite: 1]
│       ├── pages/      # Home, ReactorDetail, MultiPlant, Analytics, Alerts[cite: 1]
│       └── styles/     # HMI tokens and CSS for industrial themes[cite: 1]
├── ml-model/           # Python microservices for physics, ML, & explainability[cite: 1]
│   ├── federated/      # Local trainer & federated learning routines[cite: 1]
│   ├── simulation/     # Arrhenius kinetics (hydrogenation, nitration)[cite: 1]
│   ├── risk_engine.py  # Hybrid risk scoring model[cite: 1]
│   ├── train_lstm.py   # LSTM training pipeline[cite: 1]
│   └── train_xgboost.py# XGBoost model training script[cite: 1]
├── edge-agent/         # Edge bridge script & Modbus/OPC-UA register maps[cite: 1]
├── docs/               # System specs, API docs, TRD, PRD, ML architecture[cite: 1]
└── scripts/            # Build, deployment, and testing utilities[cite: 1]

```

---

## 🚀 Getting Started

### Prerequisites

* **Node.js**: v18.x or higher


* **Python**: v3.11.x


* **MongoDB**: v6.0+ (Local or Atlas)



### 1. Environment Setup

Copy `.env.example` to `.env` in both `backend/` and `ml-model/` directories:

```bash
cp backend/.env.example backend/.env
cp ml-model/.env.example ml-model/.env

```

[### 2. Backend Setup

```bash
cd backend
npm install
npm run dev

```

Backend runs on `http://localhost:5000` by default.

### 3. ML Service Setup

```bash
cd ml-model
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py

```

ML microservice runs on `http://localhost:8000` by default.

### 4. Frontend Setup

```bash
cd frontend
npm install
npm start

```](https://meet.google.com/trj-rbdf-wmy)

Frontend runs on `http://localhost:3000` by default.

---

## 🧪 Testing

To execute full test suites across all modules:

```bash
# Run backend tests
cd backend && npm test

# Run ML unit tests
cd ml-model && pytest

# Run frontend tests
cd frontend && npm test

```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
