const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const jwt = require('jsonwebtoken');
const logger = require('../logger');
const { safeError } = require('../utils/validation');

const ALL_PLANTS = ['PLANT_ALPHA', 'PLANT_BETA', 'PLANT_GAMMA'];

// Seed passwords come from env (defaults keep local demo working). Never
// hardcode real credentials — the defaults are dev-only demo accounts.
const SEED_CREDS = {
  admin: process.env.SEED_ADMIN_PASSWORD || 'admin123',
  superadmin: process.env.SEED_SUPERADMIN_PASSWORD || 'super123',
  operator: process.env.SEED_OPERATOR_PASSWORD || 'op123',
};

// Operators get a full day; admin/superadmin tokens are short-lived (8h) so a
// leaked admin JWT expires quickly. Roles are server-authoritative.
const TOKEN_EXPIRY = { operator: '24h', admin: '8h', superadmin: '8h' };

// Ensure a default user exists with a fresh bcrypt hash and the given plants.
const seedUser = async ({ username, password, role, name, plants }) => {
  const existing = await User.findOne({ username });
  if (!existing || !existing.password.startsWith('$2b$')) {
    await User.deleteOne({ username });
    const user = new User({ username, password, role, name, plants });
    await user.save();
  } else if (!existing.plants || existing.plants.length === 0) {
    // Older account already hashed but not yet plant-scoped — backfill.
    existing.plants = plants;
    await existing.save();
  }
  return logger.info(`${role} user '${username}' seeded (${plants.join(', ')})`);
};

const seedDefaultUsers = async () => {
  try {
    // Drop stale phone index if it exists
    try { await User.collection.dropIndex('phone_1'); } catch(e) {}

    await seedUser({ username: 'admin', password: SEED_CREDS.admin, role: 'admin', name: 'Plant Administrator', plants: ALL_PLANTS });
    await seedUser({ username: 'superadmin', password: SEED_CREDS.superadmin, role: 'superadmin', name: 'Super Administrator', plants: ALL_PLANTS });
    await seedUser({ username: 'operator', password: SEED_CREDS.operator, role: 'operator', name: 'Plant Operator', plants: ['PLANT_ALPHA'] });

  } catch (error) {
    logger.error(`User seed error: ${error.message}`);
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Record last login — never blocks the auth response.
    if (typeof user.save === 'function') {
      user.last_login = new Date();
      user.save().catch((e) => logger.warn(`last_login update failed: ${e.message}`));
    }

    // plants come from the DB (server-authoritative) so authorization is
    // enforced from the token, never from client-supplied plant selection.
    const token = jwt.sign(
      { username: user.username, role: user.role, name: user.name, plants: user.plants },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY[user.role] || '8h' }
    );

    logger.info(`Login successful: ${user.name} (${user.role})`);

    // Append-only audit trail — never blocks the auth response.
    AuditLog.appendOnly({
      event_type: 'USER_LOGIN',
      actor: String(user._id),
      plant_id: (user.plants && user.plants[0]) || undefined,
      payload: { username: user.username, role: user.role },
    }).catch((err) => logger.warn(`Audit log write failed: ${err.message}`));

    res.json({
      success: true,
      token,
      user: { username: user.username, name: user.name, role: user.role, plants: user.plants }
    });

  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
};

const register = async (req, res) => {
  try {
    const { username, password, role, name, plants } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const user = new User({ username, password, role: role || 'operator', name: name || username, plants: plants || [] });
    await user.save();

    logger.info(`User registered: ${user.username} (${user.role})`);
    res.status(201).json({ success: true, user: { username: user.username, role: user.role, name: user.name } });

  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
};

// JWT is stateless — logout discards the client token. We record the event
// for the audit trail (21 CFR Part 11); requires a valid token to attribute it.
const logout = async (req, res) => {
  try {
    AuditLog.appendOnly({
      event_type: 'USER_LOGOUT',
      actor: req.user?.id || req.user?.username || 'SYSTEM',
      payload: { username: req.user?.username },
    }).catch((err) => logger.warn(`Audit log write failed: ${err.message}`));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: safeError(error) });
  }
};

const { verifyToken, adminOnly } = require('../middleware/auth');

module.exports = { login, register, logout, verifyToken, adminOnly, seedDefaultUsers };