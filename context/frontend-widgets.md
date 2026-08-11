---
title: ThermalAI — Frontend Widgets & Auth
description: Component catalog, ASM HMI widget usage, deprecated components, and the localStorage auth pattern
modules:
  - frontend/src/components/RiskGauge.js
  - frontend/src/components/CountdownTimer.js
  - frontend/src/components/ExplainPanel.js
  - frontend/src/components/MaintenancePanel.js
  - frontend/src/components/AIComparison.js
  - frontend/src/components/AlertRow.js
  - frontend/src/components/ReactorCard.js
  - frontend/src/components/ReactorSensors.js
  - frontend/src/components/ReactorStatePanel.js
  - frontend/src/components/SensorTicker.js
  - frontend/src/components/SensorReadingTable.js
  - frontend/src/components/MetricLineChart.js
  - frontend/src/components/PlantCard.js
  - frontend/src/components/EnterpriseSummary.js
  - frontend/src/components/ReactorSelector.js
  - frontend/src/components/StatusBadge.js
  - frontend/src/components/ErrorBoundary.js
  - frontend/src/components/Skeletons.js
  - frontend/src/components/AlarmPriorityBadge.js
  - frontend/src/components/DataQualityIndicator.js
tests:
  - frontend/src/components/__tests__/MetricCard.test.js
  - frontend/src/components/__tests__/RiskGauge.test.js
  - frontend/src/components/__tests__/MaintenancePanel.test.js
references:
  - context/frontend-patterns.md
---

# ThermalAI — Frontend Widgets & Auth

Component catalog, ASM High-Performance HMI widget usage, deprecated components,
and the shared localStorage auth pattern. Page roles and app structure are in
`context/frontend-patterns.md`.

## Components

| Component | Used by | Purpose |
|---|---|---|
| `Sidebar` | App layout | Navigation links to all routes |
| `RiskGauge` | ReactorDetail | Circular gauge showing ensemble risk_score. Always renders an IEC 61511 SIL badge (SIL-0…SIL-3) next to the status pill — banding derived from score, mirrored from `backend/utils/silBands.js`; NORMAL (0–30) shows a default "SIL-0 · Normal Operations" badge rather than hiding it |
| `ExplainPanel` | ReactorDetail | Renders `/explain` response — SHAP feature-contribution bars + reasons + recommendations. Always renders: when `/explain` returns no `top_drivers` (0% risk / no anomalies), falls back to baseline bars (Jacket Temp Delta, Pressure Margin, Agitator RPM at 0%) with "All parameters operating within normal baseline bounds." rather than hiding |
| `MaintenancePanel` | ReactorDetail | Renders maintenance component health + days-to-failure. Initializes with an instant baseline RUL dataset (Coolant Pump 87%/420 hrs, Agitator Bearing 94%/1120 hrs, Valve Seal 78%/240 hrs) so health bars render immediately even before telemetry; swaps in live `/maintenance` data when available |
| `AIComparison` | ReactorDetail, Analytics | Model-comparison bench — 4 rows (Physics/Arrhenius `physics_score`, XGBoost `xgb_score`, Random Forest `rf_score`, LSTM `lstm_score`) each with optional confidence, plus the RF×40%/LSTM×60% ensemble `risk_score`. Rows with no score are skipped (no fake zeros); returns null when the reactor has none of the four model scores |
| `CountdownTimer` | ReactorDetail | Shows minutes_to_critical countdown |
| `AlertRow` | Alerts | Single alert row (severity pill, risk, priority badge) |
| `ReactorCard` | Home | Fleet reactor card (sensor grid, status pill, CRITICAL/DEGRADING pinning). Always renders a compact IEC 61511 SIL pill (SIL-0…SIL-3) beside the status badge, derived from `risk_score` via shared `getSilBand` so safe reactors still show "SIL-0" |
| `ReactorSensors` | ReactorCard | Sensor-row builders, `SensorRow`, and card `ReactorGauge` (extracted to keep files under the size guardrail) |
| `ReactorStatePanel` | ReactorDetail | Left cockpit column: gauge, model confidence, physics context, parameter alerts |
| `SensorTicker` | ReactorDetail | Live sensor tile grid with a11y meters and trend arrows |
| `SensorReadingTable` | ReactorDetail | Last-reading sensor table with inline data quality |
| `ReactorSelector` | Analytics | Dropdown to switch the analyzed reactor |
| `StatusBadge` | ReactorCard, AlertRow, ReactorDetail, MaintenancePanel, PlantCard | Shared status pill with icon + text (never color alone) for colorblind-safe HMI — maps status to a Feather icon + label; pulsing for CRITICAL. See `docs/METHODOLOGY_BRIEF.md` §3 accessibility contract. |
| `AlarmPriorityBadge` | ReactorDetail, Alerts | ISA-18.2 alarm priority badge (P1/P2/P3) with FLOOD tag — color-only for abnormal states per ASM HMI |
| `DataQualityIndicator` | ReactorDetail | Sensor data quality indicator (GOOD/DEGRADED) with fault details — grey default, amber for degraded |

> Removed components (consolidated into Home/Alerts/ReactorDetail during the single-pane-of-glass
> and HMI refactors — no longer on disk): `PredictionTimeline`, `MetricCard`, `AlertFeed`,
> `ReactorHeatmap`, `ReactorStats`, `CurrentStatusCard`. Home uses inline stat cards and the
> status-summary chip strip; Alerts renders `AlertRow` directly.

---

## Auth Pattern

JWT is stored in localStorage (not httpOnly cookie — XSS risk, acceptable for demo).

```js
// On login success:
localStorage.setItem('thermalai_token', token)
localStorage.setItem('thermalai_role', user.role)
localStorage.setItem('thermalai_name', user.name)

// On logout (Sidebar):
localStorage.clear()
navigate('/select-plant')

// Protected check (ProtectedRoute):
const token = localStorage.getItem('thermalai_token')
if (!token) return <Navigate to="/select-plant" />
```

The admin-only "Simulate Runaway" button in ReactorDetail reads `thermalai_role` from
localStorage to decide whether to render — it is not JWT-verified on the frontend;
the simulate endpoint itself has no server-side auth guard.
