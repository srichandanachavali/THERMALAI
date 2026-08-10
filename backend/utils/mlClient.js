// Thin safety wrapper over mlGateway. Every ML call is fault-tolerant: a
// failed prediction degrades to a SAFE fallback and flags ml_degraded so the
// NO-FALSE-SAFE rule holds (a reading produced while ML is down is never
// presented as a real score). Centralized here so streamReading stays lean.

const mlGateway = require("../services/mlGateway");
const logger = require("../logger");

// RF + LSTM ensemble inputs. Returns { riskResult, lstmResult, mlDegraded }.
async function runEnsemble(reading) {
  let riskResult = { risk_score: 0, status: "SAFE", parameter_alerts: [] };
  let rfFailed = false;
  try {
    riskResult = await mlGateway.predictRF(reading);
  } catch (err) {
    logger.warn("RF model not available");
    rfFailed = true;
  }

  let lstmResult = { lstm_risk_score: 0, lstm_prediction: "SAFE", lstm_confidence: 0 };
  let lstmFailed = false;
  try {
    const lstmResp = await mlGateway.predictLSTM(reading);
    if (lstmResp.success) lstmResult = lstmResp;
  } catch (err) {
    logger.warn("LSTM model not available");
    lstmFailed = true;
  }

  return { riskResult, lstmResult, mlDegraded: rfFailed && lstmFailed };
}

const SAFE_TIME = { minutes_to_critical: null, message: "", urgency: "SAFE" };
const SAFE_SIM = { predicted_temperature: null, runaway_risk_score: 0, sensor_fault_suspected: false };

// Fire-and-forget simulator probe (never blocks the response).
function simulateAsync(reading) {
  return mlGateway.simulate(reading).catch(() => {
    logger.warn("Simulation not available");
    return SAFE_SIM;
  });
}

async function predictTime(reading, ensembleScore, ensembleStatus) {
  try {
    return await mlGateway.predictTime(reading, ensembleScore, ensembleStatus);
  } catch (err) {
    logger.warn("Time prediction not available");
    return SAFE_TIME;
  }
}

async function explain(reading, ensembleScore) {
  try {
    return await mlGateway.explain(reading, ensembleScore);
  } catch (err) {
    logger.warn("Explanation not available");
    return null;
  }
}

module.exports = { runEnsemble, simulateAsync, predictTime, explain };
