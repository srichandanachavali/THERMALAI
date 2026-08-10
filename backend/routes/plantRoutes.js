const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const plantService = require("../services/plantService");
const { sanitize, safeError } = require("../utils/validation");

// PUBLIC — sanitized roster for the pre-login plant picker (PlantSelect.js).
// Reads PlantConfig from MongoDB (onboarding API) and falls back to the
// hardcoded PLANTS array while the collection is empty. Internal detail
// (reactor ids, established year, full address) is stripped.
router.get("/", async (req, res) => {
  try {
    const plants = await plantService.getPlantsForUserAsync({ role: "superadmin" });
    res.json(plants.map(plantService.toPublic));
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

// PROTECTED — plants the current user is authorized to see (full detail).
// Scopes the MultiPlant page to the user's access.
router.get("/mine", verifyToken, async (req, res) => {
  try {
    res.json(await plantService.getPlantsForUserAsync(req.user));
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

// PROTECTED — single plant, access-checked.
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const id = sanitize(req.params.id);
    if (!(await plantService.canAccessAsync(req.user, id))) {
      return res.status(403).json({ error: "Access to this plant is denied" });
    }
    const plant = await plantService.getPlantByIdAsync(id);
    if (!plant) return res.status(404).json({ error: "Plant not found" });
    res.json(plant);
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

module.exports = router;
