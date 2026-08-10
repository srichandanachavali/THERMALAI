// Builds the human-readable alert message + persistence/notification for a
// WARNING/CRITICAL ensemble reading. Extracted from reactorController so the
// stream handler stays readable and the SIL/escalation logic is testable.

const { createAndNotifyAlert } = require("../services/alertPipeline");
const { getConnector } = require("../connectors/connector-registry");
const logger = require("../logger");

// Craft the alert message, factoring in the GAS ABORT override.
function buildAlertMessage({ reactor_id, risk_score, status, gas_concentration }) {
  let message = `Reactor ${reactor_id}: ${risk_score}% ${status} risk detected`;
  if (gas_concentration > 500) {
    message += ` | GAS ABORT THRESHOLD EXCEEDED: ${gas_concentration} ppm`;
  }
  return message;
}

// Persist + broadcast an alert, then push SIL-3 to the SCADA connector.
async function handleAlert({ req, reading, ensembleScore, ensembleStatus, silResult, explainResult, plantId, gasConcentration }) {
  const alertMessage = buildAlertMessage({
    reactor_id: reading.reactor_id,
    risk_score: ensembleScore,
    status: ensembleStatus,
    gas_concentration: gasConcentration,
  });
  await createAndNotifyAlert({
    req,
    bypassCooldown: ensembleScore >= 85, // SIL-3 bypasses SMS cooldown
    alertData: {
      reactor_id: reading.reactor_id,
      plant_id: plantId,
      alert_type: ensembleStatus,
      risk_score: ensembleScore,
      temperature: reading.temperature,
      pressure: reading.pressure,
      flow_rate: reading.flow_rate,
      material_level: reading.material_level,
      gas_concentration: gasConcentration,
      ph_level: reading.ph_level,
      emissions_co2_ppm: reading.emissions_co2_ppm,
      parameter_alerts: reading.parameter_alerts || [],
      message: alertMessage,
      top_drivers: explainResult?.top_drivers || [],
      sil_level: silResult.sil,
      recommended_action: silResult.action,
    },
  });
  const connector = getConnector(plantId);
  if (connector) {
    connector.writeRiskScore(reading.reactor_id, ensembleScore).catch(() => {});
    connector.writeAlertStatus(ensembleStatus).catch(() => {});
  }
  logger.info(`Alert created for Reactor ${reading.reactor_id}`);
}

module.exports = { buildAlertMessage, handleAlert };
