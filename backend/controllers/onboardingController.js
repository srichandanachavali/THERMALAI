const axios = require("axios");
const crypto = require("crypto");
const PlantConfig = require("../models/PlantConfig");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const plantService = require("../services/plantService");
const {
  BACKEND_URL,
  buildApiKey,
  validatePlant,
  buildEdgeConfig,
  dummyReading,
  sendWelcomeEmail,
} = require("../services/onboardingService");
const logger = require("../logger");
const { sanitize, safeError } = require("../utils/validation");

// POST /api/onboard/plant — provision a plant, its operator account, and an
// edge-agent config. Idempotency is enforced by the unique plant_id.
const onboardPlant = async (req, res) => {
  try {
    const body = req.body;
    const { ok, errors } = validatePlant(body);
    if (!ok) return res.status(400).json({ error: errors.join("; ") });

    if (await PlantConfig.findOne({ plant_id: body.plant_id })) {
      return res.status(409).json({ error: `plant_id '${body.plant_id}' already exists` });
    }

    const apiKey = buildApiKey();
    const plant = new PlantConfig({
      plant_id: body.plant_id,
      name: body.name,
      location: body.location,
      city: body.city,
      state: body.state,
      type: body.type || "Other",
      reactors: body.reactors,
      contacts: body.contacts,
      subscription_tier: body.subscription_tier || "pilot",
      api_key: apiKey,
    });
    await plant.save();

    // Operator account bound to this plant only.
    const base = `op_${String(body.plant_id).toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
    let username = base;
    let n = 1;
    while (await User.findOne({ username })) username = `${base}${n++}`;
    const password = crypto.randomBytes(9).toString("base64");
    const operator = new User({
      username,
      password,
      role: "operator",
      name: `${body.name} Operator`,
      email: body.contacts[0].email,
      plants: [body.plant_id],
    });
    await operator.save();

    const edgeAgentConfig = buildEdgeConfig(plant, apiKey);
    plantService.registerPlant(plant.toObject());

    // Welcome email carries the operator login; failures never block onboarding.
    await sendWelcomeEmail(body.contacts[0], {
      username,
      password,
      plantId: body.plant_id,
      plantName: body.name,
    });

    AuditLog.appendOnly({
      event_type: "PLANT_ONBOARDED",
      actor: req.user?.username || req.user?.id || "SYSTEM",
      plant_id: body.plant_id,
      payload: { name: body.name, reactor_count: body.reactors.length, tier: plant.subscription_tier },
    }).catch((e) => logger.warn(`audit: ${e.message}`));

    logger.info(`Onboarded plant ${body.plant_id} (${body.name}) by ${req.user?.username}`);
    res.status(201).json({ plant_id: body.plant_id, api_key: apiKey, edge_agent_config: edgeAgentConfig });
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
};

// GET /api/onboard/plants — every PlantConfig with reactor count + status.
const listPlants = async (req, res) => {
  try {
    const docs = await PlantConfig.find().lean();
    const plants = docs.length
      ? docs.map((d) => ({
          plant_id: d.plant_id,
          name: d.name,
          type: d.type,
          city: d.city,
          state: d.state,
          location: d.location,
          reactor_count: (d.reactors || []).length,
          contact_count: (d.contacts || []).length,
          subscription_tier: d.subscription_tier,
          active: d.active,
          onboarded_at: d.onboarded_at,
        }))
      : plantService.PLANTS.map((p) => ({
          plant_id: p.plant_id,
          name: p.name,
          type: p.type,
          city: p.city,
          state: p.state,
          location: p.location,
          reactor_count: (p.reactors || []).length,
          contact_count: 0,
          subscription_tier: "pilot",
          active: true,
          onboarded_at: null,
        }));
    res.json(plants);
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
};

// GET /api/onboard/plants/:id/edge-config — downloadable config.json for the agent.
const edgeConfig = async (req, res) => {
  try {
    const plant = await PlantConfig.findOne({ plant_id: sanitize(req.params.plant_id) });
    if (!plant) return res.status(404).json({ error: "Plant not found" });
    const config = buildEdgeConfig(plant, plant.api_key);
    res.set("Content-Disposition", `attachment; filename="edge-config-${plant.plant_id}.json"`);
    res.set("Content-Type", "application/json");
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
};

// POST /api/onboard/plants/:id/test-connection — probe each reactor by posting a
// SAFE dummy reading to the real stream endpoint, timing the round trip.
const testConnection = async (req, res) => {
  try {
    const plant = await PlantConfig.findOne({ plant_id: sanitize(req.params.plant_id) });
    if (!plant) return res.status(404).json({ error: "Plant not found" });

    const results = await Promise.all(
      (plant.reactors || []).map(async (r) => {
        const started = Date.now();
        try {
          const resp = await axios.post(`${BACKEND_URL}/api/reactors/stream`, dummyReading(r), {
            headers: { Authorization: req.headers.authorization || "" },
            timeout: 8000,
          });
          return {
            reactor_id: r.reactor_id,
            connection_ok: resp.data && resp.data.success === true,
            latency_ms: Date.now() - started,
          };
        } catch (error) {
          return { reactor_id: r.reactor_id, connection_ok: false, latency_ms: null, error: safeError(error) };
        }
      })
    );
    res.json({ plant_id: plant.plant_id, results });
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
};

module.exports = { onboardPlant, listPlants, edgeConfig, testConnection };
