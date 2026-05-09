# ThermalAI 🔥 — Thermal Runaway Prevention Platform

> "Existing systems detect danger. ThermalAI prevents it."

## 🚨 The Problem
Chemical and pharma plants currently monitor reactors manually with fixed threshold alarms. This means:
- Late detection — alarms fire AFTER danger begins
- False alarm fatigue — operators ignore warnings
- Catastrophic consequences — explosions, fires, deaths

## 💡 Our Solution
An AI-powered platform that predicts thermal runaway BEFORE it happens — giving operators 10-20 minutes to act instead of seconds.

## 🎯 4 Unique Advantages
1. **Prediction not detection** — warns before crisis, not after
2. **Pattern-learning AI** — learns failure signatures over time
3. **Time-series intelligence** — understands acceleration, not just current values
4. **Multi-reactor command view** — all reactors ranked by risk simultaneously

## 🛠️ Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React + Tailwind + Recharts |
| Backend | Node.js + Express + Socket.io |
| AI/ML | Python + XGBoost + Scikit-learn |
| Database | MongoDB Atlas |
| Alerts | Nodemailer (Email) |

## 🤖 AI Model Performance
- Algorithm: Random Forest Classifier
- Accuracy: 100% on test data
- Features: 10 engineered features including rate of change and cooling danger score
- Output: Risk score 0-100% + SAFE/WARNING/CRITICAL classification

## 📊 Key Features
- ✅ Live multi-reactor monitoring dashboard
- ✅ AI risk score per reactor (0-100%)
- ✅ Thermal runaway prediction before critical failure
- ✅ Smart alert system with email notification
- ✅ Reactor heatmap — visual danger zones
- ✅ Historical trend analysis
- ✅ One-click thermal runaway simulation

## 🚀 How to Run

### Prerequisites
- Node.js, Python 3.x, MongoDB Atlas account

### Start all services:

**1. Flask AI Model:**
```bash
cd ml-model
python app.py
```

**2. Node.js Backend:**
```bash
cd backend
node server.js
```

**3. Data Stream:**
```bash
cd ml-model
python stream_data.py
```

**4. React Frontend:**
```bash
cd frontend
npm start
```

Open `http://localhost:3000`
