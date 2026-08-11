<!-- GENERATED -- never hand-edit. Regenerate with scripts/build_doc_manifest.sh -->

# ThermalAI -- Code Map

## Flow Spine

A sensor reading travels through the system in this order:

```
ml-model/stream_data.py          (owned by: context/dev-commands.md)
    |  POST /api/reactors/stream
    v
backend/controllers/reactorController.js   (context/api-contracts.md)
    |  POST :5001/predict   -> RF score
    |  POST :5001/predict-lstm -> LSTM score
    v
ml-model/app.py + ml-model/risk_engine.py  (context/ml-models.md)
    |  ensemble = RF*0.40 + LSTM*0.60
    v
backend/controllers/reactorController.js   (context/api-contracts.md)
    |  Reactor.save() -> MongoDB            (context/data-models.md)
    |  io.emit('reactor_update')            (context/architecture.md)
    |  if WARNING/CRITICAL:
    |    Alert.save()                       (context/data-models.md)
    |    io.emit('new_alert')               (context/architecture.md)
    v
frontend/src/context/SocketContext.js      (context/architecture.md)
    |  updates reactors[] / alerts[] state
    v
frontend/src/pages/ReactorDetail.js        (context/frontend-patterns.md)
    |  RiskGauge, ExplainPanel, MaintenancePanel, AIComparison
    +> operator sees live risk score + explanations
```

ML Watchdog (backend/server.js -> context/architecture.md):
```
setInterval(checkMLHealth, 30000 ms)
    |  GET :5001/health   timeout=5000 ms
    |  if down: io.emit('system_alert', { type: 'ML_DOWN' })
    |           Alert.save({ reactor_id:'SYSTEM', risk_score:100 })
    |  individual readings: ml_degraded:true flagged on enrichedReading
    v
frontend/src/context/SocketContext.js  -> mlStatus = 'down'
    v
frontend/src/App.js  -> MLStatusBanner shown (red banner)
```

## By-Area Ownership

### context/api-contracts.md
  - `backend/controllers/alertController.js`
  - `backend/controllers/auditController.js`
  - `backend/controllers/authController.js`
  - `backend/controllers/federatedController.js`
  - `backend/controllers/maintenanceScheduleController.js`
  - `backend/controllers/onboardingController.js`
  - `backend/controllers/reactorController.js`
  - `backend/middleware/auth.js`
  - `backend/middleware/roleGuard.js`
  - `backend/routes/adminRoutes.js`
  - `backend/routes/alertRoutes.js`
  - `backend/routes/auditRoutes.js`
  - `backend/routes/authRoutes.js`
  - `backend/routes/federatedRoutes.js`
  - `backend/routes/onboardingRoutes.js`
  - `backend/routes/plantRoutes.js`
  - `backend/routes/reactorRoutes.js`
  - `backend/services/alertPipeline.js`
  - `backend/services/mlGateway.js`
  - `backend/services/onboardingService.js`
  - `backend/services/plantService.js`
  - `backend/utils/alarmRationalization.js`
  - `backend/utils/alertBuilder.js`
  - `backend/utils/mlClient.js`
  - `backend/utils/rateLimit.js`
  - `backend/utils/silBands.js`
  - `backend/utils/validateEnv.js`
  - `backend/utils/validation.js`
  - `frontend/src/services/api.js`

### context/architecture.md
  - `backend/connectors/connector-registry.js`
  - `backend/connectors/opcua-connector.js`
  - `backend/logger.js`
  - `backend/server.js`
  - `frontend/src/context/SocketContext.js`

### context/data-models.md
  - `backend/models/Alert.js`
  - `backend/models/AuditLog.js`
  - `backend/models/FederatedUpdate.js`
  - `backend/models/PlantConfig.js`
  - `backend/models/Reactor.js`
  - `backend/models/User.js`

### context/dev-commands.md
  - `ml-model/kinetics.py`
  - `ml-model/push_to_mongo.py`
  - `ml-model/simulate_data.py`
  - `ml-model/stream_data.py`

### context/frontend-patterns.md
  - `frontend/src/App.js`
  - `frontend/src/components/Sidebar.js`
  - `frontend/src/config.js`
  - `frontend/src/constants/reactors.js`
  - `frontend/src/context/ThemeContext.js`
  - `frontend/src/hooks/useReactorHistory.js`
  - `frontend/src/index.js`
  - `frontend/src/pages/Alerts.js`
  - `frontend/src/pages/Analytics.js`
  - `frontend/src/pages/Home.js`
  - `frontend/src/pages/Login.js`
  - `frontend/src/pages/MultiPlant.js`
  - `frontend/src/pages/PlantSelect.js`
  - `frontend/src/pages/ReactorDetail.js`
  - `frontend/src/pages/Settings.js`
  - `frontend/src/reportWebVitals.js`
  - `frontend/src/styles/tokens.js`
  - `frontend/src/utils/plantStatus.js`

### context/frontend-widgets.md
  - `frontend/src/components/AIComparison.js`
  - `frontend/src/components/AlarmPriorityBadge.js`
  - `frontend/src/components/AlertRow.js`
  - `frontend/src/components/CountdownTimer.js`
  - `frontend/src/components/DataQualityIndicator.js`
  - `frontend/src/components/EnterpriseSummary.js`
  - `frontend/src/components/ErrorBoundary.js`
  - `frontend/src/components/ExplainPanel.js`
  - `frontend/src/components/MaintenancePanel.js`
  - `frontend/src/components/MetricLineChart.js`
  - `frontend/src/components/PlantCard.js`
  - `frontend/src/components/ReactorCard.js`
  - `frontend/src/components/ReactorSelector.js`
  - `frontend/src/components/ReactorSensors.js`
  - `frontend/src/components/ReactorStatePanel.js`
  - `frontend/src/components/RiskGauge.js`
  - `frontend/src/components/SensorReadingTable.js`
  - `frontend/src/components/SensorTicker.js`
  - `frontend/src/components/Skeletons.js`
  - `frontend/src/components/StatusBadge.js`

### context/known-issues.md
  *(no source files -- meta doc)*

### context/ml-models.md
  - `ml-model/app.py`
  - `ml-model/config.py`
  - `ml-model/explain_service.py`
  - `ml-model/feature_engineering.py`
  - `ml-model/features.py`
  - `ml-model/federated/local_trainer.py`
  - `ml-model/kalman_filter.py`
  - `ml-model/lstm_prepare_data.py`
  - `ml-model/maintenance.py`
  - `ml-model/predictive_maintenance.py`
  - `ml-model/risk_engine.py`
  - `ml-model/risk_service.py`
  - `ml-model/routes_maintenance.py`
  - `ml-model/routes_risk.py`
  - `ml-model/routes_simulation.py`
  - `ml-model/safety_alerts.py`
  - `ml-model/schedule_service.py`
  - `ml-model/sensor_voting.py`
  - `ml-model/sequence_buffer.py`
  - `ml-model/simulation/reactor_simulator.py`
  - `ml-model/test.py`
  - `ml-model/train_lstm.py`
  - `ml-model/train_model.py`
  - `ml-model/train_xgboost.py`
  - `ml-model/validate_data.py`

### context/open_work.md
  *(no source files -- meta doc)*

### context/roadmap.md
  *(no source files -- meta doc)*

### context/tunables.md
  *(no source files -- meta doc)*

