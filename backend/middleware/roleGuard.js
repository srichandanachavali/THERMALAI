const { verifyToken } = require("./auth");

// Alias so admin mounts read as requireAuth + requireRole in one line.
const requireAuth = verifyToken;

// requireRole('admin', 'superadmin') — 403 unless req.user.role is one of the roles.
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  next();
};

module.exports = { requireAuth, requireRole };
