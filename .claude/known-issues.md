# ThermalAI — Known Issues & Workarounds

## BLOCKER: Render ML Service Deployment Fails

**Status**: Not yet fixed  
**Symptom**: Render build times out or crashes with memory error  
**Root Cause**: `ml-model/requirements.txt` has ~200 packages including:
- PyTorch + torchvision (~2 GB) — not used in app.py
- Django (~50 MB) — not used
- Streamlit (~200 MB) — not used
- Jupyter/ipykernel/notebook (~300 MB) — not used
- OpenCV, Kaggle, debugpy — not used

Total slug far exceeds Render free tier (~512 MB RAM, 30–60s startup timeout).

**Fix Steps** (not yet implemented):

### Step 1 — Create `ml-model/requirements-prod.txt`
```
flask==3.1.2
flask-cors==6.0.2
pandas==2.3.0
numpy==2.2.6
scikit-learn==1.7.0
xgboost==3.2.0
tensorflow==2.21.0
keras==3.14.1
pymongo==3.11.4
requests==2.32.5
python-dotenv==1.2.1
gunicorn==21.2.0
```

### Step 2 — Create `ml-model/runtime.txt`
```
python-3.9.18
```
TensorFlow 2.21 does NOT support Python 3.12 (Render's default). Must pin 3.9.

### Step 3 — Update `ml-model/Procfile`
```
web: gunicorn app:app --bind 0.0.0.0:$PORT --timeout 120 --workers 1
```

### Step 4 — Commit saved-models/
Model files must be present at deploy. Options:
- Commit directly if total < 100 MB (check with `du -sh ml-model/saved-models/`)
- Or add a build script to download from cloud storage

### Step 5 — Add `render.yaml` at repo root
```yaml
services:
  - type: web
    name: thermalai-ml
    env: python
    rootDir: ml-model
    buildCommand: pip install -r requirements-prod.txt
    startCommand: gunicorn app:app --bind 0.0.0.0:$PORT --timeout 120 --workers 1
    envVars:
      - key: PYTHON_VERSION
        value: 3.9.18
```

---

## KNOWN: Alert Resolved State Only in Frontend

**Status**: Working as designed  
**Detail**: When `PUT /api/alerts/:id/resolve` is called, the backend sets `resolved: true` in MongoDB. The frontend updates local state optimistically. However, `new_alert` WebSocket events pushed from the backend do NOT include `resolved: true` since they're new alerts — this is correct behavior.

---

## KNOWN: LSTM Sequence Buffer Resets on Backend Restart

**Status**: By design (acceptable for now)  
**Detail**: `reactor_buffers` in `ml-model/app.py` is in-memory. If Flask restarts, all buffers reset and LSTM falls back to RF until 10 readings accumulate per reactor.  
**Fix when needed**: Move buffers to Redis.

---

## KNOWN: SMS Alert Cooldown Resets on Backend Restart

**Status**: By design (acceptable for now)  
**Detail**: `lastSMSTime` in `reactorController.js` is in-memory. Restart clears cooldowns.  
**Fix when needed**: Store cooldown timestamps in MongoDB or Redis.

---

## KNOWN: No JWT on /api/simulate/:id

**Status**: Acceptable for demo  
**Detail**: The simulate endpoint has no auth middleware. Anyone who knows the URL can trigger a simulated runaway.  
**Fix**: Add `verifyToken, adminOnly` middleware to simulate route in server.js.

---

## KNOWN: Gmail SMTP May Fail on Cold Start

**Status**: Intermittent  
**Detail**: Nodemailer Gmail transporter sometimes fails on first email if Gmail account has 2FA and the app password was recently reset.  
**Fix**: Use `EMAIL_PASS` as Gmail App Password (16-char, not account password). Generate at myaccount.google.com → Security → App passwords.

---

## KNOWN: React Router v7 `useNavigate` Warning

**Status**: Cosmetic  
**Detail**: React Router DOM 7 shows console warnings about future flag changes. Not a bug.

---

## KNOWN: Models Trained on Synthetic Data

**Status**: Expected — production data not yet available  
**Detail**: RF model shows 100% accuracy because test data was generated from the same synthetic distribution as training data. Real sensor data will likely show 70–90% accuracy initially.  
**When to act**: After production deployment + real data collection begins.
