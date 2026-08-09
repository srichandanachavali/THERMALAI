const fs = require("fs");
const logger = require("../logger");

const connectors = new Map();

function getConnector(plantId) {
  return connectors.get(plantId) || null;
}

// Load OPC-UA config from OPCUA_CONFIG_PATH and instantiate one connector per
// plant. Safe to call with the env var unset — no-ops so the test path never
// pulls in node-opcua. node-opcua is required lazily here for the same reason.
async function initConnectors() {
  const configPath = process.env.OPCUA_CONFIG_PATH;
  if (!configPath) {
    logger.info("OPCUA_CONFIG_PATH not set — SCADA connectors disabled");
    return;
  }
  if (!fs.existsSync(configPath)) {
    logger.warn(`OPC-UA config not found: ${configPath}`);
    return;
  }
  const OPCUAConnector = require("./opcua-connector");
  let configs;
  try {
    configs = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    logger.error(`OPC-UA config parse failed: ${error.message}`);
    return;
  }
  for (const [plantId, cfg] of Object.entries(configs)) {
    if (!cfg || !cfg.endpointUrl) continue;
    const connector = new OPCUAConnector(cfg);
    connectors.set(plantId, connector);
    connector.connect().catch((e) => logger.warn(`OPC-UA connect failed for ${plantId}: ${e.message}`));
  }
  logger.info(`OPC-UA connectors initialized for ${connectors.size} plants`);
}

module.exports = { initConnectors, getConnector };
