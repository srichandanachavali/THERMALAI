const User = require('../models/User');
const jwt = require('jsonwebtoken');

const seedDefaultUsers = async () => {
  try {
    // Drop stale phone index if it exists
    try { await User.collection.dropIndex('phone_1'); } catch(e) {}

    // Check and seed admin
    const admin = await User.findOne({ username: 'admin' });
    if (!admin || !admin.password.startsWith('$2b$')) {
      await User.deleteOne({ username: 'admin' });
      const adminUser = new User({ username: 'admin', password: 'admin123', role: 'admin', name: 'Plant Administrator' });
      await adminUser.save();
      console.log('✅ Admin user seeded');
    }

    // Check and seed operator
    const operator = await User.findOne({ username: 'operator' });
    if (!operator || !operator.password.startsWith('$2b$')) {
      await User.deleteOne({ username: 'operator' });
      const operatorUser = new User({ username: 'operator', password: 'op123', role: 'operator', name: 'Plant Operator' });
      await operatorUser.save();
      console.log('✅ Operator user seeded');
    }

  } catch (error) {
    console.log('⚠️  User seed error:', error.message);
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

    const user = new User({ username, password, role: role || 'operator', name: name || username });
    await user.save();

    console.log(`✅ User registered: ${user.username} (${user.role})`);
    res.status(201).json({ success: true, user: { username: user.username, role: user.role, name: user.name } });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { login, register, verifyToken, adminOnly, seedDefaultUsers };