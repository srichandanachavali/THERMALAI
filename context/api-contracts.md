---
title: ThermalAI — API Contracts
description: All REST endpoints, request/response shapes, Socket.io events, auth middleware, and ML Flask API contracts
modules:
  - backend/controllers/reactorController.js
  - backend/controllers/maintenanceScheduleController.js
  - backend/controllers/alertController.js
  - backend/controllers/authController.js
  - backend/middleware/auth.js
  - backend/routes/reactorRoutes.js
  - backend/routes/alertRoutes.js
  - backend/routes/authRoutes.js
  - backend/routes/plantRoutes.js
  - frontend/src/services/api.js
tests:
  - backend/tests/reactors.test.js
  - backend/tests/alerts.test.js
  - backend/tests/auth.test.js
  - backend/tests/security.test.js
  - frontend/src/services/__tests__/api.test.js
references:
  - context/architecture.md
  - context/data-models.md
  - context/ml-models.md
  - docs/SECURITY_AUDIT.md
---

# ThermalAI — API Contracts (index)

The API contracts were split by topic. The `modules:` list above is owned by this doc
(and by the linked file that describes each area):

| Topic | File |
|---|---|
| Backend REST API (port 5000) — root/health, auth, reactors, simulate, alerts, plants | [api-backend.md](api-backend.md) |
| ML Flask API (port 5001) — predict, predict-lstm, batch, predict-time, explain, maintenance | [api-ml.md](api-ml.md) |
| Socket.io events + EnrichedReading shape | [api-socket.md](api-socket.md) |
