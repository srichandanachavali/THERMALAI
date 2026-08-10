---
title: ThermalAI — API Contracts
description: All REST endpoints, request/response shapes, Socket.io events, auth middleware, and ML Flask API contracts
modules:
  - backend/controllers/reactorController.js
  - backend/controllers/maintenanceScheduleController.js
  - backend/controllers/federatedController.js
  - backend/controllers/alertController.js
  - backend/controllers/authController.js
  - backend/middleware/auth.js
  - backend/middleware/roleGuard.js
  - backend/routes/reactorRoutes.js
  - backend/routes/alertRoutes.js
  - backend/routes/authRoutes.js
  - backend/routes/plantRoutes.js
  - backend/routes/federatedRoutes.js
  - backend/routes/auditRoutes.js
  - backend/routes/adminRoutes.js
  - backend/routes/onboardingRoutes.js
  - backend/controllers/auditController.js
  - backend/controllers/onboardingController.js
  - backend/services/plantService.js
  - backend/services/onboardingService.js
  - backend/services/mlGateway.js
  - backend/services/alertPipeline.js
  - backend/utils/silBands.js
  - backend/utils/validation.js
  - backend/utils/validateEnv.js
  - backend/utils/rateLimit.js
  - backend/utils/mlClient.js
  - backend/utils/alertBuilder.js
  - frontend/src/services/api.js
tests:
  - backend/tests/reactors.test.js
  - backend/tests/alerts.test.js
  - backend/tests/auth.test.js
  - backend/tests/security.test.js
  - backend/tests/audit.test.js
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
