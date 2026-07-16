const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");

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

// PUBLIC — a user must be able to see the plant list BEFORE logging in,
// so they can pick a facility. This is what PlantSelect.js calls on mount.
router.get("/", (req, res) => {
  res.json(PLANTS);
});

// Stays protected — looking up a single plant's detail happens after login.
router.get("/:id", verifyToken, (req, res) => {
  const plant = PLANTS.find((p) => p.plant_id === req.params.id);
  if (!plant) return res.status(404).json({ error: "Plant not found" });
  res.json(plant);
});

module.exports = router;
