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

### PlantSelect (`pages/PlantSelect.js`)
- Public — accessible before login
- Shows 3 plant cards (fetches GET /api/plants)
- On plant select → navigates to `/login`

### Login (`pages/Login.js`)
- Public
- POST /api/auth/login → stores JWT in `localStorage` as `thermalai_token`
- Stores `thermalai_role` and `thermalai_name` in localStorage too
- On success → navigates to `/`

### Home (`pages/Home.js`)
- Reads `reactors` from `useSocket()`
- Shows system overview: MetricCard summary stats + ReactorHeatmap grid

### ReactorDetail (`pages/ReactorDetail.js`)
- Route param `:id` is reactor_id (e.g. `"A"`)
- Reads from `useSocket()` reactors array to find live reading
- Fetches history and maintenance on mount
- Components used: RiskGauge, PredictionTimeline, ExplainPanel, MaintenancePanel, AIComparison, CountdownTimer

### Alerts (`pages/Alerts.js`)
- Reads `alerts` from `useSocket()` (live) + initial fetch via `getAlerts()`
- Resolved alerts shown with gray/strikethrough styling
- Resolve button calls `resolveAlert(id)` then updates local state

### Analytics (`pages/Analytics.js`)
- Can operate with or without `:id` param
- Shows historical charts using reactor history data

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
| `AlertFeed` | Alerts | List of alerts with resolve button |
| `MetricCard` | Home, Analytics | Single stat card (e.g. total reactors, active alerts) |
| `ReactorHeatmap` | Home | Grid of all reactors colored by status |

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
