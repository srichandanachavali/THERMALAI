const crypto = require("crypto");
const nodemailer = require("nodemailer");
const logger = require("../logger");

// The cloud endpoint the edge agent reports into. Overridable so a deployed
// backend hands out its public URL instead of a localhost default.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

const PLAN_TYPES = ["Chemical", "Pharmaceutical", "Petroleum", "Agrochem", "Other"];
const REACTOR_TYPES = ["nitration", "hydrogenation", "lithiation", "general"];
const SENSOR_MODES = ["simulate", "modbus", "mqtt", "opcua"];
const SIL_TARGETS = ["SIL-1", "SIL-2", "SIL-3"];

const buildApiKey = () => crypto.randomBytes(32).toString("hex");

// Validate an onboarding payload. Returns { ok, errors } — never throws.
const validatePlant = (body = {}) => {
  const errors = [];
  if (!body.plant_id || !String(body.plant_id).trim()) errors.push("plant_id is required");
  if (!body.name || !String(body.name).trim()) errors.push("name is required");
  if (body.type && !PLAN_TYPES.includes(body.type)) errors.push(`type must be one of ${PLAN_TYPES.join(", ")}`);
  if (!Array.isArray(body.reactors) || body.reactors.length === 0) errors.push("at least one reactor is required");
  if (!Array.isArray(body.contacts) || body.contacts.length === 0) errors.push("at least one contact is required");
  if (body.subscription_tier && !["pilot", "standard", "enterprise"].includes(body.subscription_tier)) {
    errors.push("subscription_tier must be pilot, standard, or enterprise");
  }
  (body.reactors || []).forEach((r, i) => {
    if (!r.reactor_id) errors.push(`reactors[${i}].reactor_id is required`);
    if (r.reactor_type && !REACTOR_TYPES.includes(r.reactor_type)) errors.push(`reactors[${i}].reactor_type invalid`);
    if (r.sensor_mode && !SENSOR_MODES.includes(r.sensor_mode)) errors.push(`reactors[${i}].sensor_mode invalid`);
    if (r.sil_target && !SIL_TARGETS.includes(r.sil_target)) errors.push(`reactors[${i}].sil_target invalid`);
  });
  return { ok: errors.length === 0, errors };
};

// Ready-to-ship JSON the edge agent consumes. Includes per-reactor connection
// details and the plant API key used to authenticate /api/reactors/stream calls.
const buildEdgeConfig = (plant, apiKey) => ({
  plant_id: plant.plant_id,
  name: plant.name,
  cloud_url: BACKEND_URL,
  api_key: apiKey,
  stream_endpoint: `${BACKEND_URL}/api/reactors/stream`,
  poll_interval_sec: 5,
  reactors: (plant.reactors || []).map((r) => ({
    reactor_id: r.reactor_id,
    reactor_type: r.reactor_type || "general",
    sensor_mode: r.sensor_mode || "simulate",
    modbus_config: r.modbus_config || null,
    mqtt_topic: r.mqtt_topic || null,
    sil_target: r.sil_target || "SIL-1",
  })),
});

// A SAFE synthetic reading for the /test-connection probe — low temperature,
// healthy cooling, nominal secondary sensors. Deliberately never triggers alerts.
const dummyReading = (reactor) => ({
  reactor_id: reactor.reactor_id,
  temperature: 118.0,
  pressure: 3.8,
  reaction_rate: 0.45,
  cooling_efficiency: 0.92,
  temp_rate_of_change: 0.2,
  flow_rate: 150,
  material_level: 75,
  gas_concentration: 0,
  ph_level: 7.0,
  emissions_co2_ppm: 400,
  timestamp: new Date().toISOString(),
});

// Best-effort welcome email to the first contact carrying the operator login.
// Never throws and never blocks onboarding; failures are logged and swallowed.
const sendWelcomeEmail = async (contact, creds) => {
  if (process.env.NODE_ENV === "test") return;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn("Welcome email skipped: EMAIL_USER/EMAIL_PASS not configured");
    return;
  }
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: contact.email,
      subject: `Welcome to ThermalAI — ${creds.plantName} is onboarded`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: white;">
          <h1 style="color: #4ade80;">✅ ${creds.plantName} is live</h1>
          <p>Your plant has been added to the ThermalAI network. Login to the operator console:</p>
          <p><b>Username:</b> ${creds.username}</p>
          <p><b>Password:</b> ${creds.password} <small>(change this on first login)</small></p>
          <p><b>Plant:</b> ${creds.plantName} (${creds.plantId})</p>
          <p>Install the edge agent with the generated config to start streaming reactor data.</p>
        </div>
      `,
    });
    logger.info(`Welcome email sent to ${contact.email} for ${creds.plantId}`);
  } catch (error) {
    logger.warn(`Welcome email failed for ${creds.plantId}: ${error.message}`);
  }
};

module.exports = {
  BACKEND_URL,
  buildApiKey,
  validatePlant,
  buildEdgeConfig,
  dummyReading,
  sendWelcomeEmail,
};
