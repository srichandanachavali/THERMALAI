# ThermalAI — Deployment Guide

**Version:** 1.1.0  
**Date:** 2026-07-04

---

## Platform: Render.com

All 3 services deploy to Render via `render.yaml` and the GitHub Actions deploy hook.

| Service | Render type | Build cmd | Start cmd |
|---|---|---|---|
| Frontend | Static site | `npm run build` in `frontend/` | (served by Render CDN) |
| Backend | Web service (Node) | `npm install` | `node server.js` |
| ML API | Web service (Python) | `pip install -r requirements.txt` | `python app.py` |

**Known blocker:** ML API requires `tensorflow-cpu` (NOT `tensorflow`) in
`ml-model/requirements.txt`. Full tensorflow (~500 MB with GPU deps) OOMs the Render
free-tier build. Fix: `tensorflow-cpu==2.15.0`. See `context/known-issues.md` issue #1.

---

## Environment Variables

Set in the Render dashboard. Never commit `.env` files.

### Backend
| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `PORT` | 5000 (Render sets this automatically) |
| `JWT_SECRET` | Strong random string — never the example value |
| `EMAIL_USER` | Gmail address for alert emails |
| `EMAIL_PASS` | Gmail app password (not account password) |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE` | Twilio phone number (E.164) |
| `ALERT_PHONE` | Recipient phone for SMS alerts |
| `ML_URL` | URL of Render ML service (e.g. https://thermalai-ml.onrender.com) |

### Frontend
| Variable | Description |
|---|---|
| `REACT_APP_API_URL` | URL of Render backend `/api` (e.g. https://thermalai-backend.onrender.com/api) |

---

## CI/CD Pipeline

`.github/workflows/ci.yml` — runs on every push except `main`:
- Backend: `npm test` (Jest + supertest)
- Frontend: `CI=true npm test` (react-scripts)
- ML: `pytest tests/ -v` (no TensorFlow needed for tests)

`.github/workflows/deploy.yml` — runs on push to `main`:
- Same 3 test suites in parallel
- On all passing: triggers Render deploy hook via `curl`
- On failure: posts a commit comment with failure details

---

## Docker (local development)

```bash
docker-compose up --build
```

Services:
- `ml` (port 5001) — starts first, with healthcheck
- `backend` (port 5000) — waits for ml healthcheck
- `simulator` — waits for backend healthcheck, then streams readings
- `frontend` (port 3000) — depends on backend

Backend logs persist in Docker volume `backend-logs`.

---

## First-Time Setup (local)

```bash
bash scripts/install_hooks.sh   # required on every fresh clone
bash scripts/setup.sh           # installs deps + copies .env examples
# Edit backend/.env with real values
docker-compose up --build       # or start services manually (ml → backend → frontend → simulator)
```

---

## Render Free Tier Limitations

| Limitation | Impact |
|---|---|
| 15-min spin-down on inactivity | Cold start ~30s for first request |
| 512 MB RAM for Python service | TF OOM (use tensorflow-cpu) |
| Build timeout | Long dependency install may timeout |
| 512 MB MongoDB Atlas storage | ~14 days at 5-reactor / 2s read rate with TTL index |
