// Plant access-control abstraction — single authority for plant data and
// per-user plant authorization. Routes never reach into the raw array.
// PlantConfig (MongoDB) is the source of truth; the hardcoded PLANTS array is
// the fallback until the onboarding API has written any configs.

const PlantConfig = require("../models/PlantConfig");

const PLANTS = [
  {
    plant_id: "PLANT_ALPHA",
    name: "Alpha Chemical Works",
    location: "Patancheru Industrial Area",
    city: "Hyderabad",
    state: "Telangana",
    type: "Chemical Processing",
    reactors: ["R-101", "R-102"],
    established: "2018",
  },
  {
    plant_id: "PLANT_BETA",
    name: "Beta Pharma Industries",
    location: "Ambernath MIDC",
    city: "Mumbai",
    state: "Maharashtra",
    type: "Pharmaceutical",
    reactors: ["R-201", "R-202"],
    established: "2015",
  },
  {
    plant_id: "PLANT_GAMMA",
    name: "Gamma Refinery Ltd",
    location: "Manali Industrial Estate",
    city: "Chennai",
    state: "Tamil Nadu",
    type: "Petroleum Refinery",
    reactors: ["R-301"],
    established: "2020",
  },
];

// reactor_id -> owning plant_id
const REACTOR_PLANT = {
  "R-101": "PLANT_ALPHA", "R-102": "PLANT_ALPHA",
  "R-201": "PLANT_BETA",  "R-202": "PLANT_BETA",
  "R-301": "PLANT_GAMMA",
};

// Fields safe to expose BEFORE authentication (plant-picker roster).
const PUBLIC_FIELDS = ["plant_id", "name", "city", "state", "type"];

const getPlantById = (id) => PLANTS.find((p) => p.plant_id === id);

const getReactorPlant = (reactorId) => REACTOR_PLANT[reactorId];

// Strip internal detail (reactor ids, established year, full address).
const toPublic = (plant) => {
  const out = {};
  PUBLIC_FIELDS.forEach((f) => { out[f] = plant[f]; });
  return out;
};

// Allowed plant_ids for a user. Admins/superadmins implicitly see every plant;
// operators are limited to the plants bound to their account.
const allowedPlantIds = (user) =>
  user && ["admin", "superadmin"].includes(user.role)
    ? PLANTS.map((p) => p.plant_id)
    : (user && user.plants) || [];

const getPlantsForUser = (user) =>
  PLANTS.filter((p) => allowedPlantIds(user).includes(p.plant_id));

const canAccess = (user, plantId) =>
  allowedPlantIds(user).includes(plantId);

// Socket.io room a plant's live updates are broadcast to. Per-plant rooms keep
// an operator from receiving another plant's reactor/alert stream.
const roomForPlant = (plantId) => `plant:${plantId}`;

// ── MongoDB-backed lookups (PlantConfig), falling back to PLANTS ────────────
// DB plants store reactors as objects; the frontend expects string ids, so
// toApiPlant normalizes before it reaches the routes.
const dbOrFallback = async () => {
  const docs = await PlantConfig.find().lean();
  return docs && docs.length ? docs : PLANTS;
};

const toApiPlant = (p) => ({
  plant_id: p.plant_id,
  name: p.name,
  location: p.location,
  city: p.city,
  state: p.state,
  type: p.type,
  established: p.established,
  reactors: Array.isArray(p.reactors) && p.reactors.length && typeof p.reactors[0] === "object"
    ? p.reactors.map((r) => r.reactor_id)
    : p.reactors,
});

const allPlantIds = async () => (await dbOrFallback()).map((p) => p.plant_id);

// Admin/superadmin see every plant (DB or fallback); operators only their own.
const allowedPlantIdsAsync = async (user) =>
  user && ["admin", "superadmin"].includes(user.role)
    ? await allPlantIds()
    : (user && user.plants) || [];

const getPlantsForUserAsync = async (user) => {
  const all = await dbOrFallback();
  const ids = await allowedPlantIdsAsync(user);
  return all.filter((p) => ids.includes(p.plant_id)).map(toApiPlant);
};

const getPlantByIdAsync = async (id) => {
  const all = await dbOrFallback();
  const plant = all.find((p) => p.plant_id === id);
  return plant ? toApiPlant(plant) : null;
};

const canAccessAsync = async (user, plantId) =>
  (await allowedPlantIdsAsync(user)).includes(plantId);

// Register a freshly onboarded plant so the in-memory sync lookups used by the
// socket room + stream paths immediately reflect it. Idempotent per reactor.
const registerPlant = (config) => {
  if (PLANTS.some((p) => p.plant_id === config.plant_id)) return;
  PLANTS.push({
    plant_id: config.plant_id,
    name: config.name,
    location: config.location,
    city: config.city,
    state: config.state,
    type: config.type,
    reactors: (config.reactors || []).map((r) => (typeof r === "object" ? r.reactor_id : r)),
    established: String(new Date().getFullYear()),
  });
  (config.reactors || []).forEach((r) => {
    REACTOR_PLANT[typeof r === "object" ? r.reactor_id : r] = config.plant_id;
  });
};

module.exports = {
  PLANTS,
  getPlantById,
  getReactorPlant,
  toPublic,
  allowedPlantIds,
  getPlantsForUser,
  canAccess,
  roomForPlant,
  toApiPlant,
  getPlantsForUserAsync,
  getPlantByIdAsync,
  canAccessAsync,
  registerPlant,
};
