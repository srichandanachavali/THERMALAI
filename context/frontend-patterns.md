---
title: ThermalAI — Frontend Patterns
description: React 19 routing, SocketContext global state, API service layer, page roles, and the ML-status banner
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
  - frontend/src/components/Sidebar.js
  - frontend/src/hooks/useReactorHistory.js
  - frontend/src/utils/plantStatus.js
  - frontend/src/reportWebVitals.js
tests:
  - frontend/src/App.test.js
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

Component catalog, reusable widget list, and auth pattern live in
`context/frontend-widgets.md`.

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
- Data-source indicator pill (No Data / Simulation Mode) top-right, click → `/settings`.
  No charts here (Level 3 owns trends).

### ReactorDetail (`pages/ReactorDetail.js`) — LEVEL 2 DETAIL
- Route param `:id` is reactor_id (e.g. `"A"`)
- Reads from `useSocket()` reactors array to find live reading
- Identity header from `getReactorConfig` (tag/name/process/plant/location + colored
  process pill by keyword: nitration=orange, hydrogenation=blue, polymerization=purple)
- Two-column cockpit: left `ReactorStatePanel` (RiskGauge + model confidence + physics
  context + Active Parameter Alerts); right CountdownTimer + `SensorTicker` + a
  `DataQualityIndicator` + ExplainPanel
- Below full width: AIComparison, MaintenancePanel, `SensorReadingTable`
- No trend charts (Level 3 owns them)

### Alerts (`pages/Alerts.js`)
- Reads `alerts` from `useSocket()` (live) + initial fetch via `getAlerts()`
- Resolved alerts shown with gray/strikethrough styling
- Resolve button calls `resolveAlert(id)` then updates local state

### Analytics (`pages/Analytics.js`) — LEVEL 3 HISTORY
- Can operate with or without `:id` param
- Historical charts only — no live/current values (CurrentStatusCard removed)
- Sensor tabs for all 9 parameters (Risk/Temp/Pressure/Reaction/Cooling/Flow/Level/Gas/pH/CO₂)
  with threshold ReferenceLines from `RISK_THRESHOLDS`
- `SIL_BANDS` + `getSilBand(score)` in `constants/reactors.js` — IEC 61511 SIL banding
  (SIL-0…SIL-3) mirrored from `backend/utils/silBands.js`, used by `RiskGauge` and
  `ReactorCard` to always render the safety band (NORMAL renders "SIL-0 · Normal Operations")
- Correlation ComposedChart (Temperature vs Cooling, dual-axis) — TRL-5 feature
- Embeds `<AIComparison reactor={latestReading} />` (last reading in the filtered window) at the
  top, above the featured sensor chart — the 4-model bench (Physics/Arrhenius, XGBoost, Random
  Forest, LSTM) + the RF×40%/LSTM×60% ensemble score
- Export CSV button (Blob + object URL of filtered history)
- Time-range selector (30m/2h/8h/24h) filters loaded history client-side by timestamp
  (no re-fetch)

### MultiPlant (`pages/MultiPlant.js`)
- Fetches GET /api/plants
- Shows all plants with their reactors' current status
