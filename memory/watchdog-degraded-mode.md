---
name: watchdog-degraded-mode
description: When ML is down, the backend fallback silently returns risk_score 0/SAFE — this is a false-SAFE hazard; ml_degraded flag required on every degraded reading
metadata:
  type: project
---

When the ML Flask API is unreachable, `reactorController.streamReading()` silently
falls back to `{ risk_score: 0, status: 'SAFE' }` for both the RF and LSTM scores.
This produces an ensemble score of 0 (SAFE) — meaning a plant operator would see
"all reactors safe" while the prediction engine is completely dead.

**Why:** This was burned on 2026-07-04 when the Render ML deploy failed (TensorFlow OOM).
The backend continued sending degraded readings with `risk_score: 0 / SAFE` to the
frontend with no indicator that predictions were fabricated. The No False-Safe Fallbacks
standing rule (CLAUDE.md) was added to prevent recurrence.

**How to apply:**
- Every reading produced while `mlDown === true` in `server.js` must carry `ml_degraded: true`
  on the enrichedReading object and in the MongoDB document.
- The frontend must show a red ML-down banner (MLStatusBanner in App.js) whenever
  `mlStatus === 'down'` from SocketContext.
- Tests must assert the `ml_degraded` flag on degraded readings.
- Alerts must not auto-resolve during an ML-down period.
- See the implementation in `backend/controllers/reactorController.js` and `frontend/src/App.js`.
