const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Alert = require("../models/Alert");
const plantService = require("../services/plantService");
const reactorController = require("../controllers/reactorController");
const { getAuditLogs } = require("../controllers/auditController");
const { requireRole } = require("../middleware/roleGuard");
const logger = require("../logger");
const { safeError } = require("../utils/validation");

// Latest live state per plant, derived from in-memory reactor readings.
const latestByPlant = () => {
  const readings = reactorController.getLatestReadings();
  return plantService.PLANTS.map((p) => {
    const prs = (p.reactors || []).map((id) => readings[id]).filter(Boolean);
    const maxRisk = prs.length ? Math.max(...prs.map((r) => r.risk_score || 0)) : 0;
    let status = "ALL_NOMINAL";
    if (prs.some((r) => r.status === "CRITICAL")) status = "HAS_CRITICAL";
    else if (prs.some((r) => r.status === "WARNING")) status = "HAS_WARNINGS";
    const ts = prs.length ? Math.max(...prs.map((r) => new Date(r.timestamp).getTime())) : 0;
    return {
      plant_id: p.plant_id,
      name: p.name,
      location: p.location,
      reactor_count: prs.length,
      max_risk: maxRisk,
      status,
      last_updated: ts ? new Date(ts).toISOString() : null,
    };
  });
};

// GET /api/admin/plants — all plants with live reactor counts + latest risk.
router.get("/plants", (req, res) => res.json(latestByPlant()));

// GET /api/admin/stats — cross-plant summary (reactors + unresolved alerts).
router.get("/stats", async (req, res) => {
  try {
    const plants = latestByPlant();
    const activeAlerts = await Alert.countDocuments({ resolved: false });
    const criticalCount = await Alert.countDocuments({ resolved: false, alert_type: "CRITICAL" });
    res.json({
      total_reactors: plants.reduce((n, p) => n + p.reactor_count, 0),
      active_alerts: activeAlerts,
      critical_count: criticalCount,
      plants,
    });
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

// GET /api/admin/users — superadmin only.
router.get("/users", requireRole("superadmin"), async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

// POST /api/admin/users — create a user with role + plants (superadmin only).
router.post("/users", requireRole("superadmin"), async (req, res) => {
  try {
    const { username, password, name, email, role, plants } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    if (await User.findOne({ username })) return res.status(409).json({ error: "Username already exists" });
    const user = new User({ username, password, name: name || username, email, role: role || "operator", plants: plants || [] });
    await user.save();
    logger.info(`User created by ${req.user.username}: ${username} (${role || "operator"})`);
    res.status(201).json({ success: true, user: { _id: user._id, username: user.username, name: user.name, email: user.email, role: user.role, plants: user.plants } });
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

// PUT /api/admin/users/:id/role — superadmin only.
router.put("/users/:id/role", requireRole("superadmin"), async (req, res) => {
  try {
    const { role } = req.body;
    if (!["operator", "admin", "superadmin"].includes(role)) return res.status(400).json({ error: "Invalid role" });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
});

// GET /api/admin/audit — admin|superadmin view of the audit trail.
router.get("/audit", (req, res) => getAuditLogs(req, res));

module.exports = router;
