# ThermalAI — Product Requirements Document

**Version:** 1.1.0  
**Date:** 2026-07-04  
**Status:** Active

---

## Problem Statement

Chemical and pharmaceutical plants operate exothermic reactors where runaway reactions
can cause explosions, fires, and loss of life. Operators currently monitor temperature,
pressure, and cooling efficiency manually via SCADA dashboards — they react to threshold
breaches rather than predicting them. By the time an alarm sounds, a runaway may already
be unstoppable.

**ThermalAI** closes this gap: it predicts thermal runaway **10–20 minutes before conditions
become dangerous**, giving operators time to intervene.

---

## Users

| Role | Access | Primary need |
|---|---|---|
| Plant Operator | All dashboards (read-only), alert resolution | Real-time risk scores, early warnings, explainability |
| Plant Administrator | Full access + simulate runaway | Monitoring multiple reactors, testing emergency response |

Default credentials (seeded on first startup): `admin/admin123`, `operator/op123`.

---

## Core Functional Requirements

### FR1 — Real-Time Risk Monitoring
- Display a live risk score (0–100) for each reactor, updated every ~2 seconds
- Color-coded status: SAFE (green, <30), WARNING (yellow, 30–69), CRITICAL (red, ≥70)
- Risk gauge + trend chart visible on the ReactorDetail page

### FR2 — Predictive Warning (10–20 min horizon)
- When status is WARNING and temperature is rising, display minutes-to-critical
- Linear projection using temperature rate-of-change and a critical threshold of 162°C

### FR3 — Dual ML Ensemble
- Random Forest: single-reading feature-based classification (RF weight: 0.40)
- LSTM: sequence-based temporal pattern detection across last 10 readings (weight: 0.60)
- Ensemble formula: `risk_score = round(RF × 0.40 + LSTM × 0.60)`
- See `docs/design/ensemble_locked_spec.md` for locked spec

### FR4 — AI Explainability
- Per-reading natural language explanation of why the risk score is what it is
- Identifies top contributing factors (temperature, pressure, cooling decline)
- Visible in ExplainPanel on ReactorDetail page

### FR5 — Predictive Maintenance
- Tracks trends for Cooling System, Pressure Relief Valve, and Reaction Controller
- Displays days-to-maintenance per component
- Requires ≥5 historical readings to activate

### FR6 — Alert Center
- Real-time feed of WARNING and CRITICAL alerts, newest first
- Resolve button marks alerts resolved (gray/strikethrough)
- Alerts persist in MongoDB (30-day window until TTL)

### FR7 — SMS and Email Alerts
- Twilio SMS and Gmail SMTP email triggered on every CRITICAL reading
- 5-minute per-reactor cooldown prevents alert storms
- Plant-level contact routing (known gap: currently single global number — see open_work.md)

### FR8 — Multi-Plant Support
- 3 plants: Alpha Chemical Works (Hyderabad), Beta Pharma Industries (Mumbai), Gamma Refinery (Chennai)
- 5 reactors: A, B (Alpha), C, D (Beta), E (Gamma)
- Plant selection screen before login

### FR9 — ML Health Monitoring
- 30-second watchdog checks ML API health
- On ML-down: emits system alert, saves MongoDB Alert with reactor_id=SYSTEM, shows red banner
- `ml_degraded: true` flag on all readings produced while ML is unreachable
- Frontend MLStatusBanner visible on every protected page during degradation

---

## Non-Functional Requirements

| Requirement | Target |
|---|---|
| Update latency | ≤3 seconds from sensor reading to dashboard update |
| Risk score accuracy | F1 ≥ 0.85 on synthetic test set (SAFE/WARNING/CRITICAL) |
| Alert reliability | SMS/email triggered within 30 seconds of CRITICAL detection |
| Uptime | 99% on Render paid tier; ML service degrades gracefully |
| Auth | JWT 24h expiry, bcrypt password hashing |
| Data retention | 7-day TTL index on reactor readings |
