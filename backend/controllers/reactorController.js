const Reactor = require("../models/Reactor");
const Alert = require("../models/Alert");
const axios = require("axios");
const { sendEmailAlert, sendSMSAlert } = require("./alertController");

// Store latest reading per reactor in memory
let latestReadings = {};

// GET all reactors — latest reading per reactor
const getAllReactors = async (req, res) => {
  try {
    res.json(Object.values(latestReadings));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET specific reactor by ID
const getReactorById = async (req, res) => {
  try {
    const reading = latestReadings[req.params.id];

    if (!reading) {
      return res.status(404).json({ error: "Reactor not found" });
    }

    res.json(reading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET reactor history from MongoDB
const getReactorHistory = async (req, res) => {
  try {
    const history = await Reactor.find({
      reactor_id: req.params.id,
    })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST stream reading — called by Python every 2 seconds
const streamReading = async (req, res) => {
  try {
    const reading = req.body;

    // Call Flask AI model for risk score
  // Random Forest prediction
let riskResult = { risk_score: 0, status: 'SAFE' };
try {
  const aiResponse = await axios.post('http://localhost:5001/predict', reading);
  riskResult = aiResponse.data;
} catch (err) {
  console.log('⚠️ RF model not available');
}

// LSTM prediction
let lstmResult = { lstm_risk_score: 0, lstm_prediction: 'SAFE', lstm_confidence: 0 };
try {
  const lstmResponse = await axios.post('http://localhost:5001/predict-lstm', reading);
  if (lstmResponse.data.success) {
    lstmResult = lstmResponse.data;
  }
} catch (err) {
  console.log('⚠️ LSTM model not available');
}

// Ensemble — RF 40% + LSTM 60%
const ensembleScore = Math.round(
  (riskResult.risk_score * 0.4) + (lstmResult.lstm_risk_score * 0.6)
);

let ensembleStatus = 'SAFE';
if (ensembleScore >= 70) ensembleStatus = 'CRITICAL';
else if (ensembleScore >= 30) ensembleStatus = 'WARNING';

    // Get prediction time
    let timeResult = {
      minutes_to_critical: null,
      message: "",
      urgency: "SAFE",
    };

    try {
      const timeResponse = await axios.post(
        "http://localhost:5001/predict-time",
        {
          ...reading,
          risk_score: riskResult.risk_score,
          status: riskResult.status,
        }
      );

      timeResult = timeResponse.data;
    } catch (err) {
      console.log("⚠️ Time prediction not available");
    }
    
const enrichedReading = {
  ...reading,
  risk_score: ensembleScore,
  rf_score: riskResult.risk_score,
  lstm_score: lstmResult.lstm_risk_score,
  lstm_confidence: lstmResult.lstm_confidence,
  lstm_prediction: lstmResult.lstm_prediction,
  status: ensembleStatus,
  minutes_to_critical: timeResult.minutes_to_critical,
  time_message: timeResult.message,
  time_urgency: timeResult.urgency,
  timestamp: new Date(),
};
    // Update in-memory store
    latestReadings[reading.reactor_id] = enrichedReading;

    // Save to MongoDB
    const reactorDoc = new Reactor(enrichedReading);
    await reactorDoc.save();

    // Cooldown tracker — prevent SMS spam
    if (!global.smsCooldown) {
      global.smsCooldown = {};
    }

    // Check if alert needed
    if (
      riskResult.status === "WARNING" ||
      riskResult.status === "CRITICAL"
    ) {
      const now = Date.now();
      const lastSMS = global.smsCooldown[reading.reactor_id] || 0;
      const cooldownPeriod = 5 * 60 * 1000; // 5 minutes

      const alert = new Alert({
        reactor_id: reading.reactor_id,
        alert_type: riskResult.status,
        risk_score: riskResult.risk_score,
        temperature: reading.temperature,
        pressure: reading.pressure,
        message: `Reactor ${reading.reactor_id}: ${riskResult.risk_score}% ${riskResult.status} risk detected`,
      });

      await alert.save();

      // Broadcast alert via WebSocket
      req.io.emit("new_alert", alert);

      // Only send SMS for CRITICAL and if cooldown passed
      if (
        riskResult.status === "CRITICAL" &&
        now - lastSMS > cooldownPeriod
      ) {
        await sendSMSAlert(alert);

        global.smsCooldown[reading.reactor_id] = now;

        console.log(
          `📱 SMS sent for Reactor ${reading.reactor_id}`
        );
      }

      // Email only for CRITICAL
      if (
        riskResult.status === "CRITICAL" &&
        now - lastSMS > cooldownPeriod
      ) {
        await sendEmailAlert(alert);
      }
    }

    // Broadcast live update via WebSocket
    req.io.emit("reactor_update", enrichedReading);

    res.json({
      success: true,
      risk_score: riskResult.risk_score,
      status: riskResult.status,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getExplanation = async (req, res) => {
  try {
    const reading = req.body;

    const response = await axios.post(
      "http://localhost:5001/explain",
      reading
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllReactors,
  getReactorById,
  streamReading,
  getReactorHistory,
  getExplanation,
  getLatestReadings: () => latestReadings,
};