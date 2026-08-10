const Reactor = require('../models/Reactor');
const AuditLog = require('../models/AuditLog');
const mlGateway = require('../services/mlGateway');
const plantService = require('../services/plantService');
const { classifyRisk } = require('../utils/silBands');
const { sanitize, safeError, validateReading } = require('../utils/validation');
const { runEnsemble, simulateAsync, predictTime, explain } = require('../utils/mlClient');
const { handleAlert } = require('../utils/alertBuilder');
const logger = require('../logger');
const ML_URL = mlGateway.ML_URL;
let latestReadings = {};
const getAllReactors = async (req, res) => {
  try {
    const allowed = plantService.allowedPlantIds(req.user);
    const readings = Object.values(latestReadings).filter((r) => allowed.includes(plantService.getReactorPlant(r.reactor_id)));
    res.json(readings);
  } catch (error) { res.status(500).json({ error: safeError(error) }); }
};

const getReactorById = async (req, res) => {
  try {
    const id = sanitize(req.params.id);
    const plantId = plantService.getReactorPlant(id);
    if (!plantService.canAccess(req.user, plantId)) return res.status(403).json({ error: 'Access to this reactor is denied' });
    const reading = latestReadings[id];
    if (!reading) return res.status(404).json({ error: 'Reactor not found' });
    res.json(reading);
  } catch (error) { res.status(500).json({ error: safeError(error) }); }
};

const getReactorHistory = async (req, res) => {
  try {
    const id = sanitize(req.params.id);
    const plantId = plantService.getReactorPlant(id);
    if (!plantService.canAccess(req.user, plantId)) return res.status(403).json({ error: 'Access to this reactor is denied' });
    const history = await Reactor.find({ reactor_id: id }).sort({ timestamp: -1 }).limit(50);
    res.json(history);
  } catch (error) { res.status(500).json({ error: safeError(error) }); }
};

const streamReading = async (req, res) => {
  try {
    const reading = req.body;
    const reactorId = sanitize(reading.reactor_id);
    const { ok, errors } = validateReading(reading);
    if (!ok) return res.status(400).json({ error: errors.join('; ') });

    const { flow_rate, material_level, gas_concentration, ph_level, emissions_co2_ppm } =
      mlGateway.withSensors(reading);

    const simulationPromise = simulateAsync(reading);
    const { riskResult, lstmResult, mlDegraded } = await runEnsemble(reading);

    // Ensemble RF 40% + LSTM 60%.
    let ensembleScore = Math.round((riskResult.risk_score * 0.4) + (lstmResult.lstm_risk_score * 0.6));
    let ensembleStatus = 'SAFE';
    if (ensembleScore >= 70) ensembleStatus = 'CRITICAL';
    else if (ensembleScore >= 30) ensembleStatus = 'WARNING';

    if (gas_concentration > 500) { ensembleStatus = 'CRITICAL'; ensembleScore = Math.max(ensembleScore, 90); logger.error('GAS ABORT THRESHOLD', { reactor_id: reactorId, gas_concentration }); }

    // IEC 61511 SIL banding on the final risk score.
    const silResult = classifyRisk(ensembleScore);

    const [timeResult, simResult, explainResult] = await Promise.all([
      predictTime(reading, ensembleScore, ensembleStatus),
      simulationPromise,
      explain(reading, ensembleScore),
    ]);

    const enrichedReading = {
      ...reading,
      reactor_id: reactorId,
      flow_rate, material_level, gas_concentration, ph_level, emissions_co2_ppm, parameter_alerts: riskResult.parameter_alerts || [],
      risk_score: ensembleScore, rf_score: riskResult.risk_score,
      lstm_score: lstmResult.lstm_risk_score, lstm_confidence: lstmResult.lstm_confidence,
      lstm_prediction: lstmResult.lstm_prediction, status: ensembleStatus,
      minutes_to_critical: timeResult.minutes_to_critical, time_message: timeResult.message,
      time_urgency: timeResult.urgency, ml_degraded: mlDegraded,
      predicted_temp: simResult?.predicted_temperature ?? null, runaway_risk: simResult?.runaway_risk_score ?? 0,
      sensor_fault_suspected: simResult?.sensor_fault_suspected ?? false,
      sil_level: silResult.sil, sil_band: silResult.band, sil_color: silResult.color,
      sil_recommended_action: silResult.action, silResult, timestamp: new Date()
    };

    latestReadings[reactorId] = enrichedReading;

    const reactorDoc = new Reactor(enrichedReading);
    await reactorDoc.save();

    AuditLog.appendOnly({ event_type: 'REACTOR_READING', actor: 'SYSTEM', reactor_id: reactorId, plant_id: plantService.getReactorPlant(reactorId), payload: reading, risk_score: ensembleScore }).catch(e => logger.warn('audit: ' + e.message));

    if (ensembleStatus === 'WARNING' || ensembleStatus === 'CRITICAL') {
      await handleAlert({
        req, reading: enrichedReading, ensembleScore, ensembleStatus, silResult,
        explainResult, plantId: plantService.getReactorPlant(reactorId), gasConcentration: gas_concentration,
      });
    }

    const updateRoom = plantService.roomForPlant(plantService.getReactorPlant(reactorId));
    req.io.to(updateRoom).emit('reactor_update', enrichedReading);
    res.json({ success: true, risk_score: ensembleScore, status: ensembleStatus });

  } catch (error) { res.status(500).json({ error: safeError(error) }); }
};

const getExplanation = async (req, res) => {
  try {
    const result = await mlGateway.explain(req.body, 0);
    res.json(result);
  } catch (error) { res.status(500).json({ error: safeError(error) }); }
};

const getMaintenancePrediction = async (req, res) => {
  try {
    const id = sanitize(req.params.id);
    const history = await Reactor.find({ reactor_id: id }).sort({ timestamp: -1 }).limit(20);
    if (!history || history.length < 5) return res.json({ success: false, message: `Building data... ${history.length}/5 readings collected` });
    const readings = history.reverse().map((r) => ({ cooling_efficiency: r.cooling_efficiency, pressure: r.pressure, reaction_rate: r.reaction_rate, temperature: r.temperature }));
    const result = await mlGateway.predictMaintenance(id, readings);
    res.json(result);
  } catch (error) { res.status(500).json({ error: safeError(error) }); }
};

module.exports = {
  getAllReactors,
  getReactorById,
  streamReading,
  getReactorHistory,
  getExplanation,
  getMaintenancePrediction,
  getLatestReadings: () => latestReadings
};
