const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

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
  console.log("🔥 Simulate runaway triggered for reactor:", reactorId);

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
    console.log("Using default critical values");
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

io.on("connection", (socket) => {
  console.log("🔌 Dashboard connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("❌ Dashboard disconnected:", socket.id);
  });
});

const { seedDefaultUsers } = require("./controllers/authController");

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ Connected to MongoDB!");
    await seedDefaultUsers();
  })
  .catch((err) => console.log("❌ MongoDB Error:", err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
