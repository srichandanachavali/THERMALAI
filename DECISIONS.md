# ThermalAI — Architectural Decision Records

Decisions that shaped the system. Recorded so future contributors understand
the "why" before changing the "what."

---

## ADR-001: Dual ML Ensemble (RF + LSTM)

**Status:** Accepted  
**Date:** 2026-05-23

**Context:**  
Thermal runaway prediction requires catching both instantaneous threshold violations
(high temperature, high pressure) and evolving temporal patterns (gradual temperature
climb over multiple cycles). A single model type handles one better than the other.

**Decision:**  
Use two models in an ensemble: a Random Forest (RF) for feature-based snapshot
classification and an LSTM for sequence-based temporal pattern detection. Scores
are combined at inference time.

**Consequences:**  
+ Better coverage of both sudden anomalies and slow-burn degradation patterns  
+ Models can be retrained independently  
− Two model files to maintain (`.pkl` for RF, `.h5` for LSTM)  
− Cold-start latency: LSTM buffer needs 10 readings before predictions stabilize  

---

## ADR-002: Ensemble Weights RF × 0.40 + LSTM × 0.60

**Status:** Accepted  
**Date:** 2026-05-23

**Context:**  
Equal weighting (0.50 / 0.50) treated both models as equally reliable. In testing,
the LSTM proved more predictive for early warning — thermal runaway is fundamentally
a temporal process, and the RF has no memory across readings.

**Decision:**  
Weight LSTM at 0.60 and RF at 0.40. Formula: `risk_score = RF × 0.40 + LSTM × 0.60`,
clamped to [0, 100]. Thresholds: SAFE < 30, WARNING 30–69, CRITICAL ≥ 70.

**Consequences:**  
+ Earlier detection of slow-developing runaway events  
− RF anomalies (sudden spikes) are slightly under-weighted  
− Weights are hardcoded; changing them requires a code deploy, not a config change  

---

## ADR-003: JWT Stored in localStorage

**Status:** Accepted (with known tradeoff)  
**Date:** 2026-05-23

**Context:**  
JWTs must persist across page reloads. Two options: `localStorage` (XSS-vulnerable,
simple) or `httpOnly` cookies (XSS-resistant, requires CSRF protection and same-origin
or CORS cookie config).

**Decision:**  
Store JWT in `localStorage`. This is an internal industrial tool accessed only on
plant intranet or VPN — not a public-facing consumer app. The simpler implementation
is acceptable for the current threat model.

**Consequences:**  
+ Simple implementation; no cookie/CSRF complexity  
− If XSS is introduced anywhere in the React app, tokens are exposed  
− Must revisit if the app is ever exposed to the public internet  
**Mitigation:** Content Security Policy headers should be added at the nginx/Render level.  

---

## ADR-004: Socket.io over Server-Sent Events (SSE)

**Status:** Accepted  
**Date:** 2026-05-23

**Context:**  
Real-time reactor updates could use SSE (server-push only, HTTP, simpler) or
WebSocket/Socket.io (bidirectional, stateful). The alert system requires the
server to push to all connected clients simultaneously, not just the requesting client.

**Decision:**  
Use Socket.io. Events: `reactor_update` (every reading), `new_alert` (WARNING/CRITICAL),
`system_alert` (ML_DOWN / ML_RECOVERED). All events broadcast to every connected client.

**Consequences:**  
+ True broadcast to all dashboards without polling  
+ Bidirectional enables future client → server events if needed  
− Stateful connections increase memory per connected client  
− Socket.io adds ~30 KB to the frontend bundle  

---

## ADR-005: MongoDB over PostgreSQL

**Status:** Accepted  
**Date:** 2026-05-23

**Context:**  
Reactor readings have a consistent core shape but ML models may add or remove
fields as the feature set evolves. Alert records have varying metadata. A rigid
relational schema would require migrations on every feature change.

**Decision:**  
Use MongoDB (Atlas). Mongoose schemas provide validation at the application layer
while allowing the underlying documents to evolve. The 7-day TTL index on readings
handles automatic data retention without a cron job.

**Consequences:**  
+ Schema changes don't require migrations  
+ TTL index offloads retention management to the database  
− No foreign key constraints — referential integrity enforced in application code  
− Atlas free tier has a 512 MB storage cap (sufficient for 7-day retention at 2s intervals)  

---

## ADR-006: Separate Flask ML API (vs. embedding ML in Node)

**Status:** Accepted  
**Date:** 2026-05-23

**Context:**  
ML inference (scikit-learn, TensorFlow/Keras) requires Python. Options: run Python
as a child process from Node, use a Python-to-JS model conversion, or run Flask as
a separate service that Node calls over HTTP.

**Decision:**  
Flask ML API runs on port 5001 as an independent service. Node backend calls it via
`axios.post` on every sensor reading. The ML service exposes `/predict` (RF),
`/predict-lstm` (LSTM), `/explain`, `/maintenance`, and `/health`.

**Consequences:**  
+ ML service can be deployed, scaled, and restarted independently  
+ Full Python ML ecosystem available without shims  
+ ML failures degrade gracefully — backend falls back to RF-only score  
− Additional network hop (~2–5ms) on every reading  
− Two services to keep healthy in production (ML watchdog in server.js handles this)  

---

## ADR-007: Render.com over AWS/GCP

**Status:** Accepted  
**Date:** 2026-05-23

**Context:**  
ThermalAI is an MVP targeting a single plant. The team needs a deployment platform
that can be set up in hours, not days, without DevOps expertise or cloud billing alerts.

**Decision:**  
Deploy all 3 services to Render.com using `render.yaml`. Frontend as a static site,
backend and ML as web services. GitHub push to `main` triggers deploy via Actions hook.

**Consequences:**  
+ Zero DevOps setup; `render.yaml` defines the entire topology  
+ Free tier sufficient for demos and pilot deployments  
− **Known issue:** free tier build times out on `tensorflow-cpu` (~450 MB) — requires paid plan for ML service (see `PROGRESS.md` B1)  
− Render free tier spins down after 15 min of inactivity (cold start ~30s)  
− Not suitable for high-availability production without upgrading all services to paid  
