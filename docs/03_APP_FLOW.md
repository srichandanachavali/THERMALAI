# App Flow — Navigation & User Journey Map

## Pages / Screens
- `/login` — Login page (username + password form)
- `/` — Home / Plant select (redirects to /plants after login)
- `/plants` — Plant select: choose from available plants
- `/plants/:plantId` — Multi-plant overview: all reactors in a plant
- `/reactors/:id` — Reactor detail page: live gauge, charts, AI explanation, maintenance panel
- `/alerts` — Alert center: all alerts with resolve button and resolved state
- `/analytics` — Analytics dashboard: historical trends

## Navigation Structure
- **Sidebar** (Sidebar.js) — persistent left navigation with links to Home, Alerts, Analytics, and Plant/Reactor views
- Top-level routes managed by React Router in `App.js`
- SocketContext (SocketContext.js) provides global real-time state: `reactors[]`, `alerts[]`, `mlStatus`

## Entry Point
Login page (`/login`) — all routes are protected. Unauthenticated users are redirected to `/login`. On successful login, JWT is stored in localStorage and user is directed to the plant selection screen.

## Auth Flow
1. User visits any route → redirect to `/login` if no JWT in localStorage
2. Enter username + password → POST `/api/auth/login`
3. Server validates credentials against MongoDB (bcrypt), returns JWT
4. JWT stored in `localStorage`, user role stored for conditional UI rendering
5. On logout: JWT cleared from localStorage, redirect to `/login`
6. Admin sees simulate runaway button; operator does not

## Core User Journey 1 — Monitor a Reactor
1. Login as operator/admin
2. Select plant from plant select screen
3. View all reactor cards with live risk scores (color-coded: green/yellow/red)
4. Click reactor card → Reactor Detail page
5. View live RiskGauge (0–100 score), MetricCard panels (temperature, pressure, etc.)
6. AI Comparison panel shows RF vs LSTM individual scores
7. ExplainPanel shows feature importance breakdown
8. MaintenancePanel shows time-to-critical countdown
9. PredictionTimeline shows historical risk trajectory

## Core User Journey 2 — Respond to a Critical Alert
1. Alert appears in AlertFeed (sidebar) via `new_alert` WebSocket event
2. SMS and email sent automatically to configured operator/admin phones
3. Operator navigates to Alerts page
4. Reviews alert details: reactor ID, risk score, temperature, pressure, timestamp
5. Takes corrective action at the physical plant
6. Clicks "Resolve" button on alert → PUT `/api/alerts/:id/resolve`
7. Alert turns gray with strikethrough — resolved state persists in MongoDB

## Empty States
- No reactors connected: dashboard shows empty reactor grid with "No data" placeholder
- No alerts: Alerts page shows "No active alerts" message
- ML service down: system alert `ML_DOWN` emits via WebSocket, banner shown on dashboard

## Error States
- ML API unavailable: ML watchdog broadcasts `system_alert { type: 'ML_DOWN' }`; risk scores shown with degraded warning
- MongoDB connection failure: server startup logs error; all API routes return 500
- JWT expired/invalid: API returns 401; frontend redirects to `/login`
- Clone/push errors logged in backend via Winston logger

## Redirects
- After login: redirect to `/plants`
- After logout: redirect to `/login`
- Unauthenticated route access: redirect to `/login`
- Reactor not found: 404 response from API
