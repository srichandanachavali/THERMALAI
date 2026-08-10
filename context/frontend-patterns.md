---
title: ThermalAI — Frontend Patterns
description: React 19 routing, SocketContext global state, API service layer, pages, components, auth pattern, and ML-status banner
modules:
  - frontend/src/App.js
  - frontend/src/index.js
  - frontend/src/config.js
  - frontend/src/context/ThemeContext.js
  - frontend/src/styles/tokens.js
  - frontend/src/constants/reactors.js
  - frontend/src/pages/Home.js
  - frontend/src/pages/Login.js
  - frontend/src/pages/PlantSelect.js
  - frontend/src/pages/MultiPlant.js
  - frontend/src/pages/ReactorDetail.js
  - frontend/src/pages/Analytics.js
  - frontend/src/pages/Alerts.js
  - frontend/src/pages/Settings.js
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
  - frontend/src/components/Sidebar.js
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
  - frontend/src/hooks/useReactorHistory.js
  - frontend/src/utils/plantStatus.js
  - frontend/src/reportWebVitals.js
tests:
  - frontend/src/App.test.js
  - frontend/src/components/__tests__/MetricCard.test.js
  - frontend/src/components/__tests__/RiskGauge.test.js
references:
  - context/architecture.md
  - context/api-contracts.md
---

# ThermalAI — Frontend Patterns

## Stack

- React 19, ES modules (`import/export` — never `require`)
- React Router v6 (`BrowserRouter`, nested `Routes`)
- Tailwind CSS (utility classes, dark theme — `bg-gray-900` base)
- axios (`frontend/src/services/api.js`) for HTTP
- socket.io-client for WebSocket

---

## Routing (`frontend/src/App.js`)

```
/select-plant  →  PlantSelect       (public — no auth required)
/login         →  Login             (public)
/*             →  ProtectedRoute wrapper
    /          →  Home
    /plants    →  MultiPlant
    /reactor/:id  →  ReactorDetail
    /alerts    →  Alerts
    /analytics    →  Analytics
    /analytics/:id  →  Analytics (pre-filtered to a reactor)
```

**ProtectedRoute**: reads `localStorage.getItem("thermalai_token")`.
If null → redirect to `/select-plant`.

**Layout for protected routes**:
```
<div flex-col>
  <MLStatusBanner />        ← red banner when mlStatus === 'down'
  <div flex>
    <Sidebar />             ← fixed left, w-64
    <div flex-1 ml-64 p-6>
      <Routes> ... </Routes>
    </div>
  </div>
</div>
```

`SocketProvider` wraps only the protected subtree — no WebSocket connection on
public pages.

---

## SocketContext (`frontend/src/context/SocketContext.js`)

**Provider**: `<SocketProvider>` — wrap protected routes (done in `App.js`)

**Hook**: `const { socket, reactors, alerts, connected, mlStatus } = useSocket();`

### Context Shape

| Property | Type | Description |
|---|---|---|
| `socket` | Socket \| null | raw socket.io-client instance |
| `reactors` | EnrichedReading[] | one entry per reactor_id, updated in-place on `reactor_update` |
| `alerts` | Alert[] | newest first, max 50 items, prepended on `new_alert` |
| `connected` | boolean | WebSocket connection state |
| `mlStatus` | `'ok'` \| `'down'` \| `'recovered'` | updated by `system_alert` event |

### Event Handling

| Socket event | Effect |
|---|---|
| `reactor_update` | Find existing reactor by `reactor_id`, replace in array; if new, append |
| `new_alert` | Prepend to alerts, slice to 50 |
| `system_alert` { type: 'ML_DOWN' } | Set `mlStatus = 'down'` |
| `system_alert` { type: 'ML_RECOVERED' } | Set `mlStatus = 'ok'` |
| `disconnect` | Set `connected = false` |

Socket URL is derived from `REACT_APP_API_URL` with `/api` stripped:
```js
const API = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'
```

---

## API Service (`frontend/src/services/api.js`)

All functions are async, throw on non-2xx (axios default).

| Function | HTTP call | Returns |
|---|---|---|
| `getReactors()` | GET /api/reactors | EnrichedReading[] |
| `getReactorById(id)` | GET /api/reactors/:id | EnrichedReading |
| `getReactorHistory(id)` | GET /api/reactors/:id/history | ReactorDocument[] |
| `getAlerts()` | GET /api/alerts | Alert[] |
| `resolveAlert(id)` | PUT /api/alerts/:id/resolve | `{ success, alert }` |

---

## Pages

**SCADA information hierarchy** (one question per level, no widget on two levels):
- **Level 1 OVERVIEW** (`Home`): "Is everything OK right now?" — fleet status
- **Level 2 DETAIL** (`ReactorDetail`): "What is this reactor doing right now?" — live cockpit
- **Level 3 HISTORY** (`Analytics`): "What happened over time?" — trend analysis
Charts/trends live only on Level 3; live current readings live only on Level 2.

### PlantSelect (`pages/PlantSelect.js`)
- Public — accessible before login
- Shows 3 plant cards (fetches GET /api/plants)
- On plant select → navigates to `/login`

### Login (`pages/Login.js`)
- Public
- POST /api/auth/login → stores JWT in `localStorage` as `thermalai_token`
- Stores `thermalai_role` and `thermalai_name` in localStorage too
- On success → navigates to `/`

### Home (`pages/Home.js`) — LEVEL 1 OVERVIEW
- Reads `reactors`/`alerts`/`connected` from `useSocket()`
- 4 MetricCards (Total/Safe/Warning/Critical) + live clock
- Reactor grid: **CRITICAL pinned to top as full-width cards** (pulsing red left
  border via `thermalai-critical-pulse` + "IMMEDIATE ACTION REQUIRED" banner), then
  DEGRADING (amber border), then WARNING/SAFE by risk score. Sort order defined by
  `STATUS_ORDER`.
- Status summary strip replaces AlertFeed — last 10 alerts as clickable chips
  (`[tag SEVERITY risk% ageMin]`) that navigate to the reactor detail.
- Data-source indicator pill (🔴 No Data / 🔵 Simulation Mode) top-right, click →
  `/settings`. No charts here (Level 3 owns trends).

### ReactorDetail (`pages/ReactorDetail.js`) — LEVEL 2 DETAIL
- Route param `:id` is reactor_id (e.g. `"A"`)
- Reads from `useSocket()` reactors array to find live reading
- Identity header from `getReactorConfig` (tag/name/process/plant/location + colored
  process pill by keyword: nitration=orange, hydrogenation=blue, polymerization=purple)
- Two-column cockpit: left (40%) RiskGauge + **model confidence** (HIGH/MEDIUM/LOW +
  RF/LSTM weight split, from `confidence`/`rf_weight_used`/`lstm_weight_used` with
  `lstm_confidence`/40-60 fallback) + **physics context** (runaway threshold + margin
  to runaway, color-coded) + **Active Parameter Alerts** panel; right (60%) CountdownTimer
  + live sensor ticker (with trend arrows) + ExplainPanel
- Below full width: AIComparison, PredictionTimeline, MaintenancePanel, **ReactorHeatmap**
  (moved here from Home — per-reactor floor context)
- No trend charts (Level 3 owns them); maintenance fetched on mount

### Alerts (`pages/Alerts.js`)
- Reads `alerts` from `useSocket()` (live) + initial fetch via `getAlerts()`
- Resolved alerts shown with gray/strikethrough styling
- Resolve button calls `resolveAlert(id)` then updates local state

### Analytics (`pages/Analytics.js`) — LEVEL 3 HISTORY
- Can operate with or without `:id` param
- Historical charts only — no live/current values (CurrentStatusCard removed)
- Sensor tabs for all 9 parameters (Risk/Temp/Pressure/Reaction/Cooling/Flow/Level/Gas/pH/CO₂)
  with threshold ReferenceLines from `RISK_THRESHOLDS`
- Correlation ComposedChart (Temperature vs Cooling, dual-axis) — TRL-5 feature
- Export CSV button (Blob + object URL of filtered history)
- Time-range selector (30m/2h/8h/24h) filters loaded history client-side by timestamp
  (no re-fetch)

### MultiPlant (`pages/MultiPlant.js`)
- Fetches GET /api/plants
- Shows all plants with their reactors' current status

---

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
| `AlertRow` | Alerts | Single alert row (severity pill, risk, resolve button) |
| `MetricCard` | Analytics | Single stat card (e.g. total reactors, active alerts) — Home now uses inline stat cards |
| `ReactorCard` | Home | Fleet reactor card (sensor grid, status pill, CRITICAL/DEGRADING pinning) |
| `ReactorSelector` | Analytics | Dropdown to switch the analyzed reactor |
| `ReactorHeatmap` | ReactorDetail | Grid of all reactors colored by status — moved off Home to Level 2 |
| `StatusBadge` | ReactorCard, AlertRow, ReactorDetail, MaintenancePanel, PlantCard | Shared status pill with icon + text (never color alone) for colorblind-safe HMI — maps status to a Feather icon + label; pulsing for CRITICAL. See `docs/METHODOLOGY_BRIEF.md` §3 accessibility contract. |

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
