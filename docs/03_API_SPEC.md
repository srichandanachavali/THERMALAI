# ThermalAI — API Specification

**Version:** 1.1.0  
**Date:** 2026-07-04

> Full API reference with request/response shapes: `context/api-contracts.md`  
> This doc summarises the contract at a design level.

---

## Auth

JWT Bearer token. Sign in at `POST /api/auth/login`, receive token, include as:
```
Authorization: Bearer <token>
```
Token expires in 24 hours. Stored in `localStorage` under `thermalai_token`.

## Endpoint Summary

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | / | none | Health check |
| GET | /health | none | Service + ML health status |
| POST | /api/auth/login | none | Returns JWT |
| POST | /api/auth/register | admin | Create new user |
| GET | /api/reactors | none | Latest reading per reactor |
| GET | /api/reactors/:id | none | Single reactor latest reading |
| GET | /api/reactors/:id/history | none | Last 50 readings from MongoDB |
| POST | /api/reactors/stream | none | Ingest sensor reading → ML prediction |
| POST | /api/reactors/explain | none | AI explainability for a reading |
| GET | /api/reactors/:id/maintenance | none | Predictive maintenance forecast |
| GET | /api/alerts | none | Last 50 alerts, newest first |
| PUT | /api/alerts/:id/resolve | none | Mark alert resolved |
| GET | /api/plants | none | All 3 hardcoded plants |
| GET | /api/plants/:id | none | Single plant by plant_id |
| POST | /api/simulate/:id | none (frontend guards) | Inject CRITICAL reading (admin) |

## EnrichedReading Schema

The core payload emitted on `reactor_update` and returned by stream:

```json
{
  "reactor_id": "R-101",
  "temperature": 148.3,
  "pressure": 5.1,
  "reaction_rate": 0.72,
  "cooling_efficiency": 0.78,
  "temp_rate_of_change": 1.2,
  "risk_score": 49,
  "rf_score": 42.0,
  "lstm_score": 53.5,
  "lstm_confidence": 71.2,
  "lstm_prediction": "WARNING",
  "status": "WARNING",
  "minutes_to_critical": 18.4,
  "ml_degraded": false,
  "timestamp": "2026-05-23T10:30:00.000Z"
}
```

`ml_degraded: true` when both RF and LSTM are unreachable. Risk score in this case is
0 by arithmetic default — NOT a real prediction. See NO FALSE-SAFE FALLBACKS rule.

## ML Flask API (port 5001)

Internal — called by backend only. External callers should use backend endpoints.

| Method | Path | Returns |
|---|---|---|
| GET | /health | `{ status, models_loaded, reactor_buffers }` |
| POST | /predict | RF risk score + probabilities |
| POST | /predict-lstm | LSTM risk score + confidence |
| POST | /predict-time | minutes_to_critical + urgency |
| POST | /explain | Natural language reasons + recommendations |
| POST | /maintenance-bulk | Component health + days-to-maintenance |
