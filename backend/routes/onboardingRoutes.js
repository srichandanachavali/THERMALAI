const express = require("express");
const router = express.Router();
const { adminOnly } = require("../middleware/auth");
const {
  onboardPlant,
  listPlants,
  edgeConfig,
  testConnection,
} = require("../controllers/onboardingController");

// All onboarding endpoints are admin-scoped. The router is mounted behind
// requireAuth in server.js, so req.user is guaranteed here.

router.post("/plant", adminOnly, onboardPlant);
router.get("/plants", adminOnly, listPlants);
router.get("/plants/:plant_id/edge-config", adminOnly, edgeConfig);
router.post("/plants/:plant_id/test-connection", adminOnly, testConnection);

module.exports = router;
