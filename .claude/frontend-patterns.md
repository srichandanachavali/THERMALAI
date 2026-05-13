# ThermalAI — Frontend Patterns

## Tech Stack
- React 19, React Router DOM 7
- Tailwind CSS 3 (dark theme — gray-900/800/700 palette)
- Recharts 3 (LineChart, ResponsiveContainer)
- Axios 1.x (HTTP)
- Socket.io-client 4 (WebSocket)

---

## Routing (App.js)

```jsx
/              → PlantSelect (if not logged in) or Home (if logged in)
/login         → Login (receives plant via location.state.plant)
/reactor/:id   → ReactorDetail
/alerts        → Alerts
/analytics/:id → Analytics
/multi-plant   → MultiPlant
```

Auth check pattern used in App.js:
```jsx
const token = localStorage.getItem('thermalai_token');
// redirect to / (PlantSelect) if no token
```

---

## Global State — SocketContext

**File**: `frontend/src/context/SocketContext.js`

```jsx
// What it provides:
const { reactors, alerts } = useSocket();

// reactors: array of latest reading per reactor (updated live via WebSocket)
// alerts:   array of recent alerts (prepended on new_alert event, max 50)
```

Connecting:
```jsx
import { useSocket } from '../context/SocketContext';
const { reactors, alerts } = useSocket();
```

The socket connects to `REACT_APP_API_URL` base (strips `/api`).

---

## API Service (services/api.js)

```javascript
import {
  getReactors,        // GET /api/reactors
  getReactorById,     // GET /api/reactors/:id
  getReactorHistory,  // GET /api/reactors/:id/history  → array (already reversed in ReactorDetail)
  getAlerts,          // GET /api/alerts
  resolveAlert,       // PUT /api/alerts/:id/resolve
} from '../services/api';
```

BASE_URL from `process.env.REACT_APP_API_URL` (fallback: `http://localhost:5000/api`).

---

## API URL Pattern (used in components that call backend directly)

```javascript
const API = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
// Use: `${API}/api/reactors/...`
```
This strips `/api` from the env var because the env already includes `/api`.

---

## Component Map

| Component | File | Props | What it does |
|-----------|------|-------|-------------|
| Sidebar | components/Sidebar.js | — | Nav links + user info + plant name |
| RiskGauge | components/RiskGauge.js | `score, status` | Semicircular gauge 0–100 |
| ReactorHeatmap | components/ReactorHeatmap.js | — | Temperature heatmap grid |
| AlertFeed | components/AlertFeed.js | — | Reads alerts from SocketContext |
| CountdownTimer | components/CountdownTimer.js | `reactor` | Countdown from `reactor.minutes_to_critical` |
| PredictionTimeline | components/PredictionTimeline.js | `reactor` | Visual forecast timeline |
| ExplainPanel | components/ExplainPanel.js | `reactor` | Calls /explain, shows reasons + recommendations |
| MaintenancePanel | components/MaintenancePanel.js | `reactor` | Calls /maintenance, health bars + urgency |
| MetricCard | components/MetricCard.js | reactor data | Card with status badge, metrics |
| AIComparison | components/AIComparison.js | `reactor` | RF vs LSTM vs Ensemble bar chart |

---

## Page Structure

### ReactorDetail (/reactor/:id)
Layout (top to bottom):
1. Header (back button, title, admin simulate button)
2. CountdownTimer
3. RiskGauge + 4 metric cards (temp, pressure, reaction rate, cooling)
4. 4 live line charts (temp, pressure, risk score, cooling efficiency)
5. AIComparison panel
6. PredictionTimeline
7. ExplainPanel
8. MaintenancePanel
9. "View Full History" button → /analytics/:id

History management:
```javascript
// Seeds from GET /api/reactors/:id/history (reversed to ascending)
// Then appends each reactor_update WebSocket event
// Keeps last 20 readings for chart display
const [history, setHistory] = useState([]);
```

### Alerts (/alerts)
- Merges GET /api/alerts + live SocketContext alerts
- Deduplicates by `_id`
- Resolved state: gray border, "RESOLVED" badge, strikethrough name, no resolve button
- Unresolved: ✓ Resolve button calls resolveAlert(alert._id), updates local state optimistically

---

## Styling Conventions

- **Dark theme only**: bg-gray-900 (page), bg-gray-800 (cards), bg-gray-700 (inputs/bars)
- **Status colors**:
  - SAFE: green-400 / green-500
  - WARNING: yellow-400 / yellow-500
  - CRITICAL: red-400 / red-500
  - Resolved: gray-500 / gray-600
- **Text**: white (primary), gray-400 (secondary), gray-500 (muted)
- **Borders**: border-l-4 for alert rows (colored by type)
- **Tailwind classes** not CSS files — avoid adding custom CSS unless absolutely necessary

---

## Auth Storage (localStorage)

```javascript
localStorage.getItem('thermalai_token')       // JWT string
localStorage.getItem('thermalai_user')        // JSON: { username, name, role }
localStorage.getItem('thermalai_plant')       // JSON: plant object
```

Role check pattern (used in ReactorDetail for simulate button):
```javascript
const user = JSON.parse(localStorage.getItem('thermalai_user') || '{}');
if (user.role === 'admin') { /* show admin controls */ }
```
