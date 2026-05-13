const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Seed default users into MongoDB on first startup
const seedDefaultUsers = async () => {
  try {
    const count = await User.countDocuments();
    if (count > 0) return;

    await User.create([
      { username: 'admin', password: 'admin123', role: 'admin', name: 'Plant Administrator' },
      { username: 'operator', password: 'op123', role: 'operator', name: 'Plant Operator' }
    ]);
    console.log('✅ Default users seeded into MongoDB');
  } catch (error) {
    console.log('⚠️  User seed error:', error.message);
  }
};

// Login with username and password
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

    const token = jwt.sign(
      { username: user.username, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`✅ Login successful: ${user.name} (${user.role})`);

    res.json({
      success: true,
      token,
      user: { username: user.username, name: user.name, role: user.role }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Register a new user (admin only)
const register = async (req, res) => {
  try {
    const { username, password, role, name } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const user = await User.create({ username, password, role: role || 'operator', name: name || username });

    console.log(`✅ User registered: ${user.username} (${user.role})`);
    res.status(201).json({ success: true, user: { username: user.username, role: user.role, name: user.name } });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { login, register, verifyToken, adminOnly, seedDefaultUsers };
