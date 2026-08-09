const Reactor = require('../models/Reactor');
const AuditLog = require('../models/AuditLog');
const axios = require('axios');
const { createAndNotifyAlert } = require('../services/alertPipeline');
const mlGateway = require('../services/mlGateway');
const plantService = require('../services/plantService');
const { getConnector } = require('../connectors/connector-registry');
const { classifyRisk } = require('../utils/silBands');
const logger = require('../logger');
const ML_URL = mlGateway.ML_URL;
let latestReadings = {};
const getAllReactors = async (req, res) => {
  try {
    const allowed = plantService.allowedPlantIds(req.user);
    const readings = Object.values(latestReadings).filter((r) => allowed.includes(plantService.getReactorPlant(r.reactor_id)));
    res.json(readings);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getReactorById = async (req, res) => {
  try {
    const plantId = plantService.getReactorPlant(req.params.id);
    if (!plantService.canAccess(req.user, plantId)) return res.status(403).json({ error: 'Access to this reactor is denied' });
    const reading = latestReadings[req.params.id];
    if (!reading) return res.status(404).json({ error: 'Reactor not found' });
    res.json(reading);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getReactorHistory = async (req, res) => {
  try {
    const plantId = plantService.getReactorPlant(req.params.id);
    if (!plantService.canAccess(req.user, plantId)) return res.status(403).json({ error: 'Access to this reactor is denied' });
    const history = await Reactor.find({ reactor_id: req.params.id }).sort({ timestamp: -1 }).limit(50);
    res.json(history);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const streamReading = async (req, res) => {
  try {
    const reading = req.body;
    const { flow_rate, material_level, gas_concentration, ph_level, emissions_co2_ppm } =
      mlGateway.withSensors(reading);

    const simulationPromise = mlGateway.simulate(reading)
      .catch(() => { logger.warn('Simulation not available'); return null; });

    let riskResult = { risk_score: 0, status: 'SAFE', parameter_alerts: [] };
    let rfFailed = false;
    try { riskResult = await mlGateway.predictRF(reading); } catch (err) { logger.warn('RF model not available'); rfFailed = true; }

    let lstmResult = { lstm_risk_score: 0, lstm_prediction: 'SAFE', lstm_confidence: 0 };
    let lstmFailed = false;
    try { const lstmResp = await mlGateway.predictLSTM(reading); if (lstmResp.success) lstmResult = lstmResp; } catch (err) { logger.warn('LSTM model not available'); lstmFailed = true; }

    const mlDegraded = rfFailed && lstmFailed;

    // Ensemble RF 40% + LSTM 60%.
    let ensembleScore = Math.round((riskResult.risk_score * 0.4) + (lstmResult.lstm_risk_score * 0.6));
    let ensembleStatus = 'SAFE';
    if (ensembleScore >= 70) ensembleStatus = 'CRITICAL';
    else if (ensembleScore >= 30) ensembleStatus = 'WARNING';

    const parameter_alerts = riskResult.parameter_alerts || [];
    if (gas_concentration > 500) { ensembleStatus = 'CRITICAL'; ensembleScore = Math.max(ensembleScore, 90); logger.error('GAS ABORT THRESHOLD', { reactor_id: reading.reactor_id, gas_concentration }); }

    // IEC 61511 SIL banding on the final risk score.
    const silResult = classifyRisk(ensembleScore);

    let timeResult = { minutes_to_critical: null, message: '', urgency: 'SAFE' };
    try { timeResult = await mlGateway.predictTime(reading, ensembleScore, ensembleStatus); } catch (err) { logger.warn('Time prediction not available'); }

    const simResult = await simulationPromise;

    const explainResult = await mlGateway.explain(reading, ensembleScore)
      .catch(() => { logger.warn('Explanation not available'); return null; });

    const enrichedReading = {
      ...reading,
      flow_rate, material_level, gas_concentration, ph_level, emissions_co2_ppm, parameter_alerts,
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

    latestReadings[reading.reactor_id] = enrichedReading;

    const reactorDoc = new Reactor(enrichedReading);
    await reactorDoc.save();

    AuditLog.appendOnly({ event_type: 'REACTOR_READING', actor: 'SYSTEM', reactor_id: reading.reactor_id, plant_id: plantService.getReactorPlant(reading.reactor_id), payload: reading, risk_score: ensembleScore }).catch(e => logger.warn('audit: ' + e.message));

    if (ensembleStatus === 'WARNING' || ensembleStatus === 'CRITICAL') {
      let alertMessage = `Reactor ${reading.reactor_id}: ${ensembleScore}% ${ensembleStatus} risk detected`;
      if (gas_concentration > 500) alertMessage += ` | GAS ABORT THRESHOLD EXCEEDED: ${gas_concentration} ppm`;
      await createAndNotifyAlert({
        req,
        bypassCooldown: ensembleScore >= 85, // SIL-3 bypasses SMS cooldown
        alertData: {
          reactor_id: reading.reactor_id, plant_id: plantService.getReactorPlant(reading.reactor_id),
          alert_type: ensembleStatus, risk_score: ensembleScore,
          temperature: reading.temperature, pressure: reading.pressure,
          flow_rate, material_level, gas_concentration, ph_level, emissions_co2_ppm, parameter_alerts,
          message: alertMessage, top_drivers: (explainResult?.top_drivers) || [],
          sil_level: silResult.sil, recommended_action: silResult.action
        }
      });
      const connector = getConnector(plantService.getReactorPlant(reading.reactor_id));
      if (connector) { connector.writeRiskScore(reading.reactor_id, ensembleScore).catch(() => {}); connector.writeAlertStatus(ensembleStatus).catch(() => {}); }
    }

    const updateRoom = plantService.roomForPlant(plantService.getReactorPlant(reading.reactor_id));
    req.io.to(updateRoom).emit('reactor_update', enrichedReading);
    res.json({ success: true, risk_score: ensembleScore, status: ensembleStatus });

  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getExplanation = async (req, res) => {
  try {
    const reading = req.body;
    const response = await axios.post(`${ML_URL}/explain`, reading);
    res.json(response.data);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getMaintenancePrediction = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await Reactor.find({ reactor_id: id }).sort({ timestamp: -1 }).limit(20);
    if (!history || history.length < 5) return res.json({ success: false, message: `Building data... ${history.length}/5 readings collected` });
    const readings = history.reverse().map((r) => ({ cooling_efficiency: r.cooling_efficiency, pressure: r.pressure, reaction_rate: r.reaction_rate, temperature: r.temperature }));
    const response = await axios.post(`${ML_URL}/maintenance-bulk`, { reactor_id: id, readings });

    res.json(response.data);
  } catch (error) { res.status(500).json({ error: error.message }); }
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