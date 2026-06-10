const Alert = require("../models/Alert");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const logger = require("../logger");

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Twilio setup
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

// Per-plant contact overrides — falls back to shared env vars if not set
const PLANT_CONTACTS = {
  'PLANT_ALPHA': { phone: process.env.PLANT1_PHONE || process.env.ALERT_PHONE, email: process.env.PLANT1_EMAIL || process.env.EMAIL_USER },
  'PLANT_BETA':  { phone: process.env.PLANT2_PHONE || process.env.ALERT_PHONE, email: process.env.PLANT2_EMAIL || process.env.EMAIL_USER },
  'PLANT_GAMMA': { phone: process.env.PLANT3_PHONE || process.env.ALERT_PHONE, email: process.env.PLANT3_EMAIL || process.env.EMAIL_USER },
};

// Send SMS alert
const sendSMSAlert = async (alert) => {
  const contact = PLANT_CONTACTS[alert.plant_id] || { phone: process.env.ALERT_PHONE };
  try {
    await twilioClient.messages.create({
      body: `🚨 ThermalAI ALERT\nReactor ${alert.reactor_id}: ${alert.alert_type}\nRisk Score: ${alert.risk_score}%\nTemp: ${alert.temperature}°C\nImmediate action required!`,
      from: process.env.TWILIO_PHONE,
      to: contact.phone,
    });
    logger.info(`SMS alert sent for Reactor ${alert.reactor_id}`);
  } catch (error) {
    logger.error(`SMS error: ${error.message}`);
  }
};

// Send email alert
const sendEmailAlert = async (alert) => {
  const contact = PLANT_CONTACTS[alert.plant_id] || { email: process.env.EMAIL_USER };
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: contact.email,
      subject: `🚨 ThermalAI ALERT — Reactor ${alert.reactor_id} ${alert.alert_type}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: white;">
          <h1 style="color: ${alert.alert_type === "CRITICAL" ? "#ff4444" : "#ffaa00"};">
            ⚠️ ${alert.alert_type} ALERT
          </h1>
          <h2>Reactor ${alert.reactor_id}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #333;">
              <td style="padding: 10px; color: #aaa;">Risk Score</td>
              <td style="padding: 10px; font-size: 24px; font-weight: bold; color: #ff4444;">
                ${alert.risk_score}%
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; color: #aaa;">Temperature</td>
              <td style="padding: 10px;">${alert.temperature}°C</td>
            </tr>
            <tr style="background: #333;">
              <td style="padding: 10px; color: #aaa;">Pressure</td>
              <td style="padding: 10px;">${alert.pressure} bar</td>
            </tr>
            <tr>
              <td style="padding: 10px; color: #aaa;">Message</td>
              <td style="padding: 10px;">${alert.message}</td>
            </tr>
            <tr style="background: #333;">
              <td style="padding: 10px; color: #aaa;">Time</td>
              <td style="padding: 10px;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
          <p style="color: #ff4444; margin-top: 20px;">
            ⚡ Immediate action required — ThermalAI Prevention System
          </p>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);
    logger.info(`Email alert sent for Reactor ${alert.reactor_id}`);
  } catch (error) {
    logger.error(`Email error: ${error.message}`);
  }
};

// GET all alerts — newest first
const getAllAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(50);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT resolve an alert
const resolveAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { resolved: true },
      { new: true },
    );
    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }
    res.json({ success: true, alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllAlerts,
  resolveAlert,
  sendEmailAlert,
  sendSMSAlert,
};
