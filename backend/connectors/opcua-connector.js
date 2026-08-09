const logger = require("../logger");

// Pushes alert data into plant SCADA/DCS via OPC-UA.
// node-opcua is required lazily so the heavy dependency never loads unless
// a connector is actually instantiated (keeps the test path dependency-free).
class OPCUAConnector {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.session = null;
    this.connected = false;
  }

  async connect() {
    const { OPCUAClient } = require("node-opcua");
    const client = OPCUAClient.create({
      applicationName: "ThermalAI",
      connectionStrategy: { maxRetry: 3, initialDelay: 1000, maxDelay: 5000 },
    });
    await client.connect(this.config.endpointUrl);
    const session = await client.createSession({
      userName: this.config.username,
      password: this.config.password,
    });
    this.client = client;
    this.session = session;
    this.connected = true;
    logger.info("OPC-UA connected", { endpoint: this.config.endpointUrl });
  }

  async writeRiskScore(reactorId, riskScore) {
    if (!this.connected) return { success: false, reason: "not_connected" };
    try {
      const { AttributeIds, DataType } = require("node-opcua");
      await this.session.write({
        nodeId: this.config.nodeIds.riskScore,
        attributeId: AttributeIds.Value,
        value: { value: { dataType: DataType.Double, value: riskScore } },
      });
      return { success: true };
    } catch (error) {
      logger.error(`OPC-UA writeRiskScore failed: ${error.message}`);
      return { success: false, reason: error.message };
    }
  }

  async writeAlertStatus(status) {
    if (!this.connected) return { success: false, reason: "not_connected" };
    const map = { NORMAL: 0, WARNING: 1, CRITICAL: 2 };
    const value = map[status] ?? 0;
    try {
      const { AttributeIds, DataType } = require("node-opcua");
      await this.session.write({
        nodeId: this.config.nodeIds.alertStatus,
        attributeId: AttributeIds.Value,
        value: { value: { dataType: DataType.Int32, value } },
      });
      return { success: true };
    } catch (error) {
      logger.error(`OPC-UA writeAlertStatus failed: ${error.message}`);
      return { success: false, reason: error.message };
    }
  }

  async disconnect() {
    try {
      if (this.session) {
        await this.session.close();
        this.session = null;
      }
      if (this.client) {
        await this.client.disconnect();
        this.client = null;
      }
    } catch (error) {
      logger.warn(`OPC-UA disconnect: ${error.message}`);
    } finally {
      this.connected = false;
    }
  }
}

module.exports = OPCUAConnector;
