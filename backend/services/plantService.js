// Plant access-control abstraction — single authority for plant data and
// per-user plant authorization. Routes never reach into the raw array.

const PLANTS = [
  {
    plant_id: "PLANT_ALPHA",
    name: "Alpha Chemical Works",
    location: "Patancheru Industrial Area",
    city: "Hyderabad",
    state: "Telangana",
    type: "Chemical Processing",
    reactors: ["A", "B"],
    established: "2018",
  },
  {
    plant_id: "PLANT_BETA",
    name: "Beta Pharma Industries",
    location: "Ambernath MIDC",
    city: "Mumbai",
    state: "Maharashtra",
    type: "Pharmaceutical",
    reactors: ["C", "D"],
    established: "2015",
  },
  {
    plant_id: "PLANT_GAMMA",
    name: "Gamma Refinery Ltd",
    location: "Manali Industrial Estate",
    city: "Chennai",
    state: "Tamil Nadu",
    type: "Petroleum Refinery",
    reactors: ["E"],
    established: "2020",
  },
];

// reactor_id -> owning plant_id
const REACTOR_PLANT = {
  A: "PLANT_ALPHA", B: "PLANT_ALPHA",
  C: "PLANT_BETA",  D: "PLANT_BETA",
  E: "PLANT_GAMMA",
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

module.exports = {
  PLANTS,
  getPlantById,
  getReactorPlant,
  toPublic,
  allowedPlantIds,
  getPlantsForUser,
  canAccess,
  roomForPlant,
};
