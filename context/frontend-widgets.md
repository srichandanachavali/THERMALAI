---
title: ThermalAI — Frontend Widgets & Auth
description: Component catalog, ASM HMI widget usage, deprecated components, and the localStorage auth pattern
modules:
  - frontend/src/components/RiskGauge.js
  - frontend/src/components/CountdownTimer.js
  - frontend/src/components/PredictionTimeline.js
  - frontend/src/components/ExplainPanel.js
  - frontend/src/components/MaintenancePanel.js
  - frontend/src/components/MetricCard.js
  - frontend/src/components/AIComparison.js
  - frontend/src/components/AlertFeed.js
  - frontend/src/components/AlertRow.js
  - frontend/src/components/ReactorCard.js
  - frontend/src/components/ReactorSensors.js
  - frontend/src/components/ReactorStatePanel.js
  - frontend/src/components/SensorTicker.js
  - frontend/src/components/SensorReadingTable.js
  - frontend/src/components/ReactorHeatmap.js
  - frontend/src/components/MetricLineChart.js
  - frontend/src/components/ReactorStats.js
  - frontend/src/components/PlantCard.js
  - frontend/src/components/EnterpriseSummary.js
  - frontend/src/components/ReactorSelector.js
  - frontend/src/components/CurrentStatusCard.js
  - frontend/src/components/StatusBadge.js
  - frontend/src/components/ErrorBoundary.js
  - frontend/src/components/Skeletons.js
  - frontend/src/components/AlarmPriorityBadge.js
  - frontend/src/components/DataQualityIndicator.js
tests:
  - frontend/src/components/__tests__/MetricCard.test.js
  - frontend/src/components/__tests__/RiskGauge.test.js
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
| `RiskGauge` | ReactorDetail | Circular gauge showing ensemble risk_score |
| `PredictionTimeline` | ReactorDetail, Analytics | Time-series chart of risk scores |
| `ExplainPanel` | ReactorDetail | Renders `/explain` response (reasons + recommendations) |
| `MaintenancePanel` | ReactorDetail | Renders maintenance component health + days-to-failure |
| `AIComparison` | ReactorDetail | Side-by-side RF vs LSTM score comparison |
| `CountdownTimer` | ReactorDetail | Shows minutes_to_critical countdown |
| `AlertRow` | Alerts | Single alert row (severity pill, risk, priority badge) |
| `MetricCard` | Analytics | Single stat card (e.g. total reactors, active alerts) — Home now uses inline stat cards |
| `ReactorCard` | Home | Fleet reactor card (sensor grid, status pill, CRITICAL/DEGRADING pinning) |
| `ReactorSensors` | ReactorCard | Sensor-row builders, `SensorRow`, and card `ReactorGauge` (extracted to keep files under the size guardrail) |
| `ReactorStatePanel` | ReactorDetail | Left cockpit column: gauge, model confidence, physics context, parameter alerts |
| `SensorTicker` | ReactorDetail | Live sensor tile grid with a11y meters and trend arrows |
| `SensorReadingTable` | ReactorDetail | Last-reading sensor table with inline data quality |
| `ReactorSelector` | Analytics | Dropdown to switch the analyzed reactor |
| `ReactorHeatmap` | — | Grid of all reactors colored by status — removed from all pages in single-pane-of-glass refactor; no page imports it (orphaned, still doc-owned) |
| `StatusBadge` | ReactorCard, AlertRow, ReactorDetail, MaintenancePanel, PlantCard | Shared status pill with icon + text (never color alone) for colorblind-safe HMI — maps status to a Feather icon + label; pulsing for CRITICAL. See `docs/METHODOLOGY_BRIEF.md` §3 accessibility contract. |
| `AlarmPriorityBadge` | ReactorDetail, Alerts | ISA-18.2 alarm priority badge (P1/P2/P3) with FLOOD tag — color-only for abnormal states per ASM HMI |
| `DataQualityIndicator` | ReactorDetail | Sensor data quality indicator (GOOD/DEGRADED) with fault details — grey default, amber for degraded |

> `AlertFeed` (`components/AlertFeed.js`) is deprecated — Home replaced it with the
> status-summary chip strip; Alerts renders `AlertRow` directly. Kept in the repo
> (still doc-owned) but no page imports it.

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
