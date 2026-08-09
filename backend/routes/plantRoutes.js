const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const plantService = require("../services/plantService");

// PUBLIC — sanitized roster for the pre-login plant picker (PlantSelect.js).
// Internal detail (reactor ids, established year, full address) is stripped.
router.get("/", (req, res) => {
  res.json(plantService.PLANTS.map(plantService.toPublic));
});

// PROTECTED — plants the current user is authorized to see (full detail).
// Scopes the MultiPlant page to the user's access.
router.get("/mine", verifyToken, (req, res) => {
  res.json(plantService.getPlantsForUser(req.user));
});

// PROTECTED — single plant, access-checked.
router.get("/:id", verifyToken, (req, res) => {
  if (!plantService.canAccess(req.user, req.params.id)) {
    return res.status(403).json({ error: "Access to this plant is denied" });
  }
  const plant = plantService.getPlantById(req.params.id);
  if (!plant) return res.status(404).json({ error: "Plant not found" });
  res.json(plant);
});

module.exports = router;
