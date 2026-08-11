const Reactor = require('../models/Reactor');
const AuditLog = require('../models/AuditLog');
const Alert = require('../models/Alert');
const mlGateway = require('../services/mlGateway');
const plantService = require('../services/plantService');
const { classifyRisk } = require('../utils/silBands');
const { sanitize, safeError, validateReading } = require('../utils/validation');
const { runEnsemble, simulateAsync, predictTime, explain } = require('../utils/mlClient');
const { AlarmRationalization, ALARM_PRIORITIES } = require('../utils/alarmRationalization');
const logger = require('../logger');

let latestReadings = {};
const alarmSystem = new AlarmRationalization(); // singleton

const getAllReactors = async (req, res) => {
  try {
    const allowed = plantService.allowedPlantIds(req.user);
    const readings = Object.values(latestReadings).filter((r) =>
      allowed.includes(plantService.getReactorPlant(r.reactor_id))
    );
    res.json(readings);
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
};

const getReactorById = async (req, res) => {
  try {
    const id = sanitize(req.params.id);
    const plantId = plantService.getReactorPlant(id);
    if (!plantService.canAccess(req.user, plantId)) {
      return res.status(403).json({ error: 'Access to this reactor is denied' });
    }
    const reading = latestReadings[id];
    if (!reading) return res.status(404).json({ error: 'Reactor not found' });
    res.json(reading);
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
};

const getReactorHistory = async (req, res) => {
  try {
    const id = sanitize(req.params.id);
    const plantId = plantService.getReactorPlant(id);
    if (!plantService.canAccess(req.user, plantId)) {
      return res.status(403).json({ error: 'Access to this reactor is denied' });
    }
    const history = await Reactor.find({ reactor_id: id })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
};

const streamReading = async (req, res) => {
  try {
    const reading = req.body;
    const reactorId = sanitize(reading.reactor_id);
    const { ok, errors } = validateReading(reading);
    if (!ok) return res.status(400).json({ error: errors.join('; ') });

    const { flow_rate, material_level, gas_concentration, ph_level, emissions_co2_ppm } =
      mlGateway.withSensors(reading);

    const fullSensorReading = {
      ...reading,
      flow_rate,
      material_level,
      gas_concentration,
      ph_level,
      emissions_co2_ppm,
    };

    const simulationPromise = simulateAsync(fullSensorReading);
    const { riskResult, lstmResult, xgbResult, physicsResult, mlDegraded } = await runEnsemble(fullSensorReading);

    // Ensemble RF 40% + LSTM 60%
    let ensembleScore = Math.round(
      (riskResult.risk_score * 0.4) + (lstmResult.lstm_risk_score * 0.6)
    );

    // Enforce parameter alert safety floor overrides
    const paramAlerts = riskResult.parameter_alerts || [];
    const hasCriticalAlert = paramAlerts.some((a) => a.severity === 'CRITICAL');
    const hasWarningAlert = paramAlerts.some((a) => a.severity === 'WARNING');

    if (hasCriticalAlert) {
      ensembleScore = Math.max(ensembleScore, 75);
    } else if (hasWarningAlert) {
      ensembleScore = Math.max(ensembleScore, 45);
    }

    if (gas_concentration > 500) {
      ensembleScore = Math.max(ensembleScore, 90);
      logger.error('GAS ABORT THRESHOLD BREACHED', { reactor_id: reactorId, gas_concentration });
    }

    ensembleScore = Math.min(100, Math.max(0, ensembleScore));

    let ensembleStatus = 'SAFE';
    if (ensembleScore >= 70) ensembleStatus = 'CRITICAL';
    else if (ensembleScore >= 30) ensembleStatus = 'WARNING';

    // IEC 61511 SIL banding on final risk score
    const silResult = classifyRisk(ensembleScore);

    const [timeResult, simResult, explainResult] = await Promise.all([
      predictTime(fullSensorReading, ensembleScore, ensembleStatus),
      simulationPromise,
      explain(fullSensorReading, ensembleScore),
    ]);

    const enrichedReading = {
      ...fullSensorReading,
      reactor_id: reactorId,
      parameter_alerts: paramAlerts,
      risk_score: ensembleScore,
      rf_score: riskResult.risk_score,
      lstm_score: lstmResult.lstm_risk_score,
      lstm_confidence: lstmResult.lstm_confidence,
      lstm_prediction: lstmResult.lstm_prediction,
      status: ensembleStatus,
      xgb_score: xgbResult.xgb_risk_score ?? 0,
      xgb_confidence: xgbResult.xgb_confidence ?? 0,
      xgb_prediction: xgbResult.xgb_prediction ?? 'SAFE',
      physics_score: physicsResult.physics_risk_score ?? 0,
      physics_prediction: physicsResult.physics_prediction ?? 'SAFE',
      minutes_to_critical: timeResult.minutes_to_critical,
      time_message: timeResult.message,
      time_urgency: timeResult.urgency,
      ml_degraded: mlDegraded,
      predicted_temp: simResult?.predicted_temperature ?? null,
      runaway_risk: simResult?.runaway_risk_score ?? 0,
      sensor_fault_suspected: simResult?.sensor_fault_suspected ?? false,
      data_quality: riskResult.data_quality || 'good',
      sensor_validation: riskResult.sensor_validation || null,
      sil_level: silResult.sil,
      sil_band: silResult.band,
      sil_color: silResult.color,
      sil_recommended_action: silResult.action,
      silResult,
      timestamp: new Date(),
    };

    latestReadings[reactorId] = enrichedReading;

    const reactorDoc = new Reactor(enrichedReading);
    await reactorDoc.save();

    AuditLog.appendOnly({
      event_type: 'REACTOR_READING',
      actor: 'SYSTEM',
      reactor_id: reactorId,
      plant_id: plantService.getReactorPlant(reactorId),
      payload: fullSensorReading,
      risk_score: ensembleScore,
    }).catch((e) => logger.warn('audit: ' + e.message));

    // Alarm Rationalization (ISA-18.2)
    const alarmType = alarmSystem.classifyAlarm(enrichedReading, ensembleScore);
    if (alarmType) {
      const decision = alarmSystem.shouldAlert(reactorId, alarmType, ensembleScore);
      if (decision.should_alert) {
        const alert = new Alert({
          reactor_id: reactorId,
          plant_id: plantService.getReactorPlant(reactorId),
          alert_type: alarmType.startsWith('CRITICAL') ? 'CRITICAL' : 'WARNING',
          risk_score: ensembleScore,
          temperature: enrichedReading.temperature,
          pressure: enrichedReading.pressure,
          message: decision.is_flood_notification
            ? decision.message
            : `Reactor ${reactorId}: ${alarmType} — Risk ${ensembleScore}%`,
          top_drivers: explainResult?.top_drivers || [],
          sil_level: silResult.sil,
          recommended_action: silResult.action,
          priority: ALARM_PRIORITIES[alarmType]?.label || 'P2-PROMPT',
          is_flood_notification: decision.is_flood_notification || false,
          suppressed_count: 0,
          flow_rate: enrichedReading.flow_rate,
          material_level: enrichedReading.material_level,
          gas_concentration: enrichedReading.gas_concentration,
          ph_level: enrichedReading.ph_level,
          emissions_co2_ppm: enrichedReading.emissions_co2_ppm,
          parameter_alerts: enrichedReading.parameter_alerts || [],
        });
        await alert.save();
        const { sendEmailAlert, sendSMSAlert } = require('./alertController');
        sendEmailAlert(alert);
        sendSMSAlert(alert);
        req.io.to('operators').emit('new_alert', alert);
      } else {
        logger.info('Alert suppressed by rationalization', {
          reactor_id: reactorId,
          reason: decision.reason,
          alarm_type: alarmType,
        });
      }
    }

    const updateRoom = plantService.roomForPlant(plantService.getReactorPlant(reactorId));
    req.io.to(updateRoom).emit('reactor_update', enrichedReading);
    res.json({ success: true, risk_score: ensembleScore, status: ensembleStatus });
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
};

const getExplanation = async (req, res) => {
  try {
    const reading = req.body || {};
    const riskScore = reading.risk_score || 0;
    const result = await mlGateway.explain(reading, riskScore);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
};

const getMaintenancePrediction = async (req, res) => {
  try {
    const id = sanitize(req.params.id);
    const history = await Reactor.find({ reactor_id: id })
      .sort({ timestamp: -1 })
      .limit(20);
    if (!history || history.length < 5) {
      return res.json({
        success: false,
        message: `Building data... ${history ? history.length : 0}/5 readings collected`,
      });
    }
    const readings = history.reverse().map((r) => ({
      cooling_efficiency: r.cooling_efficiency,
      pressure: r.pressure,
      reaction_rate: r.reaction_rate,
      temperature: r.temperature,
      flow_rate: r.flow_rate,
      material_level: r.material_level,
    }));
    const result = await mlGateway.predictMaintenance(id, readings);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
};

module.exports = {
  getAllReactors,
  getReactorById,
  streamReading,
  getReactorHistory,
  getExplanation,
  getMaintenancePrediction,
  getLatestReadings: () => latestReadings,
};