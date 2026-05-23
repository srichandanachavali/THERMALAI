const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");
const logger = require("./logger");

dotenv.config();

const ML_URL = process.env.ML_URL || 'http://localhost:5001';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get("/", (req, res) => {
  res.json({ message: "ThermalAI Backend Running 🔥" });
});

// Simulate route FIRST before other routes
app.post("/api/simulate/:id", async (req, res) => {
  const reactorId = req.params.id;
  logger.info(`Simulate runaway triggered for reactor: ${reactorId}`);

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
    const aiResponse = await axios.post(
      `${ML_URL}/predict`,
      criticalReading,
    );
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

  io.emit("reactor_update", enrichedReading);

  const Alert = require("./models/Alert");
  const alert = new Alert({
    reactor_id: reactorId,
    alert_type: "CRITICAL",
    risk_score: riskResult.risk_score,
    temperature: criticalReading.temperature,
    pressure: criticalReading.pressure,
    message: `🚨 SIMULATED RUNAWAY — Reactor ${reactorId}: ${riskResult.risk_score}% critical risk!`,
  });
  await alert.save();
  io.emit("new_alert", alert);

  res.json({ success: true, risk_score: riskResult.risk_score });
});

// Other routes AFTER simulate
const reactorRoutes = require("./routes/reactorRoutes");
const alertRoutes = require("./routes/alertRoutes");
const authRoutes = require("./routes/authRoutes");
const plantRoutes = require("./routes/plantRoutes");
app.use("/api/reactors", reactorRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/plants", plantRoutes);
// ── Health check endpoint ──────────────────────────────────────────────
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

// ── ML watchdog loop ───────────────────────────────────────────────────
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

      // Save a system alert to MongoDB so it appears in the alert center
      const Alert = require('./models/Alert');
      const sysAlert = new Alert({
        reactor_id: 'SYSTEM',
        alert_type: 'CRITICAL',
        risk_score: 100,
        message: '🚨 ML prediction service is DOWN. Risk scores may be inaccurate.',
      });
      await sysAlert.save().catch(e => logger.error('Failed to save ML down alert:', e));
    }
  }
}

// Check every 30 seconds
setInterval(checkMLHealth, 30000);
checkMLHealth(); // also run immediately on startup

io.on("connection", (socket) => {
  logger.info(`Dashboard connected: ${socket.id}`);
  socket.on("disconnect", () => {
    logger.info(`Dashboard disconnected: ${socket.id}`);
  });
});

const { seedDefaultUsers } = require("./controllers/authController");

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    logger.info("Connected to MongoDB");
    await seedDefaultUsers();
  })
  .catch((err) => logger.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
