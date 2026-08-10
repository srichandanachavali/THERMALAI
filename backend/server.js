const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const logger = require("./logger");
const { verifyToken, adminOnly } = require("./middleware/auth");
const plantService = require("./services/plantService");
const AuditLog = require("./models/AuditLog");

dotenv.config();

// DNS resilience: this host's only resolver intermittently fails SRV lookups; add public fallbacks.
const PUBLIC_DNS = ['8.8.8.8', '8.8.4.4'];
const dns = require('dns');
const currentServers = dns.getServers();
const missing = PUBLIC_DNS.filter((s) => !currentServers.includes(s));
if (missing.length) {
  dns.setServers([...currentServers, ...missing]);
}

const ML_URL = process.env.ML_URL || 'http://localhost:5001';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const CORS_ORIGINS = FRONTEND_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGINS, credentials: true },
});

app.use(helmet());
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: '32kb' }));

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.io auth: reject any handshake without a valid JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('unauthorized'));
  if (!process.env.JWT_SECRET) return next(new Error('server misconfigured'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    next(new Error('unauthorized'));
  }
});

app.get("/", (req, res) => {
  res.json({ message: "ThermalAI Backend Running 🔥" });
});

app.post("/api/simulate/:id", verifyToken, adminOnly, async (req, res) => {
  const reactorId = req.params.id;
  logger.info(`Simulate runaway triggered for reactor: ${reactorId} by ${req.user?.username}`);

  const criticalReading = {
    reactor_id: reactorId,
    temperature: 285,
    pressure: 9.2,
    reaction_rate: 0.95,
    cooling_efficiency: 0.18,
    temp_rate_of_change: 8.5,
    label: "CRITICAL",
    timestamp: new Date().toISOString(),
  };

  let riskResult = { risk_score: 99.5, status: "CRITICAL" };
  try {
    const aiResponse = await axios.post(`${ML_URL}/predict`, criticalReading);
    riskResult = aiResponse.data;
  } catch (err) {
    logger.warn("ML unavailable during simulate — using default critical values");
  }

  const enrichedReading = {
    ...criticalReading,
    risk_score: riskResult.risk_score,
    status: "CRITICAL",
    timestamp: new Date(),
  };

  const plantRoom = plantService.roomForPlant(plantService.getReactorPlant(reactorId));
  io.to(plantRoom).emit("reactor_update", enrichedReading);

  const Alert = require("./models/Alert");
  const alert = new Alert({
    reactor_id: reactorId,
    plant_id: plantService.getReactorPlant(reactorId),
    alert_type: "CRITICAL",
    risk_score: riskResult.risk_score,
    temperature: criticalReading.temperature,
    pressure: criticalReading.pressure,
    message: `🚨 SIMULATED RUNAWAY — Reactor ${reactorId}: ${riskResult.risk_score}% critical risk!`,
  });
  await alert.save();
  io.to(plantRoom).emit("new_alert", alert);

  res.json({ success: true, risk_score: riskResult.risk_score });
});

const reactorRoutes = require("./routes/reactorRoutes");
const alertRoutes = require("./routes/alertRoutes");
const authRoutes = require("./routes/authRoutes");
const plantRoutes = require("./routes/plantRoutes");
const federatedRoutes = require("./routes/federatedRoutes");
const auditRoutes = require("./routes/auditRoutes");
const adminRoutes = require("./routes/adminRoutes");
const onboardingRoutes = require("./routes/onboardingRoutes");
const { requireAuth, requireRole } = require("./middleware/roleGuard");
app.use("/api/reactors", reactorRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/plants", plantRoutes);
app.use("/api/federated", federatedRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/admin", requireAuth, requireRole("admin", "superadmin"), adminRoutes);
app.use("/api/onboard", requireAuth, onboardingRoutes);
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    uptime: Math.floor(process.uptime()) + 's',
    ml: 'unknown'
  };
  try {
    await axios.get(`${ML_URL}/health`, { timeout: 3000 });
    health.ml = 'ok';
  } catch {
    health.ml = 'down';
  }
  const code = health.ml === 'down' ? 503 : 200;
  res.status(code).json(health);
});

// ML watchdog loop
let mlDown = false;

async function checkMLHealth() {
  try {
    await axios.get(`${ML_URL}/health`, { timeout: 5000 });
    if (mlDown) {
      logger.info('ML API recovered');
      io.emit('system_alert', {
        type: 'ML_RECOVERED',
        message: 'ML prediction service has been restored'
      });
      mlDown = false;
    }
  } catch (err) {
    if (!mlDown) {
      logger.error(`ML API is DOWN: ${err.message}`);
      io.emit('system_alert', {
        type: 'ML_DOWN',
        message: 'ML prediction service is unavailable — risk scores may be inaccurate'
      });
      mlDown = true;

      const Alert = require('./models/Alert');
      const sysAlert = new Alert({
        reactor_id: 'SYSTEM',
        alert_type: 'CRITICAL',
        risk_score: 100,
        temperature: 0,
        pressure: 0,
        message: '🚨 ML prediction service is DOWN. Risk scores may be inaccurate.',
      });
      await sysAlert.save().catch(e => logger.error('Failed to save ML down alert:', e));
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  setInterval(checkMLHealth, 30000);
  checkMLHealth();
}

io.on("connection", (socket) => {
  logger.info(`Dashboard connected: ${socket.id} user=${socket.user?.username}`);
  // Join only the rooms for plants this user is authorized to receive.
  plantService.allowedPlantIds(socket.user).forEach((plantId) => {
    socket.join(plantService.roomForPlant(plantId));
  });
  socket.on("disconnect", () => {
    logger.info(`Dashboard disconnected: ${socket.id}`);
  });
});

const { seedDefaultUsers } = require("./controllers/authController");

if (process.env.NODE_ENV !== 'test') {
  // Retry initial connect so a transient Atlas outage doesn't leave a dead DB connection.
  const connectWithRetry = async (attempt = 0) => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
      logger.info("Connected to MongoDB");
      await seedDefaultUsers();
      AuditLog.appendOnly({ event_type: 'SYSTEM_START', actor: 'SYSTEM', payload: { version: '1.0', env: process.env.NODE_ENV || 'development' } })
        .catch((e) => logger.warn(`audit: ${e.message}`));
    } catch (err) {
      logger.error(`MongoDB connection failed (attempt ${attempt + 1}): ${err.message}`);
      const delay = Math.min(1000 * 2 ** attempt, 30000);
      setTimeout(() => connectWithRetry(attempt + 1), delay);
    }
  };
  connectWithRetry();

  // SCADA/DCS OPC-UA connectors — non-blocking; failures never affect startup.
  require("./connectors/connector-registry").initConnectors().catch((e) => logger.warn(`OPC-UA init: ${e.message}`));

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

module.exports = { app, server, io };
