# ThermalAI — Claude Context Guide

> This file tells Claude everything needed to work effectively in this codebase.
> Detailed references live in `.claude/` — load them when the task touches that domain.

---

## What This Project Is

**ThermalAI** is an AI-powered thermal runaway prevention platform for chemical/pharmaceutical industrial plants. It predicts dangerous reactor conditions **10–20 minutes before they happen** using a dual ML ensemble (Random Forest + LSTM), gives operators real-time risk scores, explainability, predictive maintenance forecasts, and triggers SMS/email alerts.

**Stack**: React 19 → Node/Express 5 → Flask ML API → MongoDB Atlas  
**Real-time**: Socket.io (WebSocket) pushes every reactor update to all dashboards  
**Auth**: JWT stored in localStorage, role-based (admin / operator)

---

## Repo Structure

```
THERMALAI/
├── CLAUDE.md                  ← you are here
├── .claude/                   ← detailed context files (read these for deep work)
│   ├── architecture.md        ← service topology, data flow, ports
│   ├── api-contracts.md       ← all REST + WebSocket endpoints, request/response shapes
│   ├── ml-models.md           ← feature engineering, model architecture, ensemble logic
│   ├── data-models.md         ← MongoDB schemas + plant config
│   ├── frontend-patterns.md   ← React routing, SocketContext, component map
│   ├── dev-commands.md        ← how to start/stop all services
│   └── known-issues.md        ← deployment blockers, bugs, workarounds
├── frontend/                  ← React app (port 3000)
├── backend/                   ← Express API (port 5000)
└── ml-model/                  ← Flask ML API (port 5001)
```

---

## Critical Rules (Always Apply)

1. **Backend uses CommonJS** (`require`/`module.exports`) throughout — never use `import/export` there.
2. **Frontend uses ES modules** (`import/export`) — never use `require` there.
3. **The ML Flask API runs on port 5001**, backend on **5000**, frontend on **3000**. Never mix them up in URLs.
4. **JWT secret is in `backend/.env`** as `JWT_SECRET`. Never hardcode it.
5. **MongoDB models** are in `backend/models/`. Reactor, Alert, User, Plant.
6. **`seedDefaultUsers()`** in `authController.js` runs on startup — it only seeds if the users collection is empty. Default: `admin/admin123`, `operator/op123`.
7. **bcrypt** is used for password hashing via `User.pre('save')` hook and `user.comparePassword()`.
8. **Socket.io events** that matter: `reactor_update` (new reading), `new_alert` (alert created).
9. **Alert `resolved` field** — the UI in `Alerts.js` already handles resolved state (gray/strikethrough). The backend endpoint `PUT /api/alerts/:id/resolve` is wired.
10. **ML ensemble**: `risk_score = RF_score × 0.40 + LSTM_score × 0.60`. Status: <30 SAFE, 30–69 WARNING, ≥70 CRITICAL.

---

## Key Files to Know

| File | What it does |
|------|-------------|
| `backend/server.js` | Express setup, Socket.io, MongoDB connect, simulate route |
| `backend/controllers/reactorController.js` | Stream endpoint — calls ML, computes ensemble, saves, broadcasts |
| `backend/controllers/authController.js` | Login (DB+bcrypt), register (admin-only), seedDefaultUsers |
| `backend/controllers/alertController.js` | Alert CRUD, email (Nodemailer), SMS (Twilio) |
| `ml-model/app.py` | Flask ML API — loads RF + LSTM at startup, all prediction endpoints |
| `ml-model/stream_data.py` | Simulates sensor data (replaces real hardware for now) |
| `frontend/src/context/SocketContext.js` | Global state — reactors[], alerts[] updated via WebSocket |
| `frontend/src/pages/ReactorDetail.js` | Main reactor page — gauge, charts, AI comparison, maintenance |
| `frontend/src/pages/Alerts.js` | Alert center — resolve button, resolved visual state |
| `frontend/src/services/api.js` | All axios calls — getReactors, getAlerts, resolveAlert, etc. |

---

## Environment Variables

### `backend/.env`
```
MONGO_URI=mongodb+srv://...
PORT=5000
JWT_SECRET=thermalai_secret_key_2026
EMAIL_USER=...@gmail.com
EMAIL_PASS=...              # Gmail app password (not account password)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE=+1...
ALERT_PHONE=+91...
OPERATOR_PHONE=+91...
ADMIN_PHONE=+91...
```

### `frontend/.env` / `.env.production`
```
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Current Implementation Status

### Done
- [x] Real-time reactor monitoring (WebSocket)
- [x] Dual ML ensemble (RF + LSTM) with time-to-critical
- [x] AI explainability panel
- [x] Predictive maintenance panel
- [x] Alert center with resolve button + resolved visual state
- [x] Database-backed auth (MongoDB + bcrypt + JWT)
- [x] Admin-only simulate runaway button
- [x] SMS (Twilio) + Email (Nodemailer) notifications
- [x] Multi-plant support (3 plants, 5 reactors)

### Pending / Known Gaps
- [ ] Render deployment fix (see `.claude/known-issues.md` — requirements.txt bloat)
- [ ] Real sensor data integration (post-production — replace `stream_data.py`)
- [ ] ML model retraining on real data
- [ ] Docker / docker-compose setup
- [ ] CI/CD pipeline (.github/workflows)
- [ ] Winston logging (replace console.log in backend)
- [ ] MongoDB TTL index on reactor readings (7-day retention)
- [ ] Per-plant SMS/email contacts (currently hardcoded)

---

## Load These Files For Deep Work

| Task type | Load |
|-----------|------|
| Adding/changing API endpoints | `.claude/api-contracts.md` |
| Changing ML predictions or features | `.claude/ml-models.md` |
| Working on frontend pages/components | `.claude/frontend-patterns.md` |
| Debugging or deploying | `.claude/known-issues.md` + `.claude/dev-commands.md` |
| Changing DB schemas | `.claude/data-models.md` |
| Understanding service wiring | `.claude/architecture.md` |
