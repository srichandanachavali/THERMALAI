const Alert = require('../models/Alert');
const nodemailer = require('nodemailer');

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send email alert
const sendEmailAlert = async (alert) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `🚨 ThermalAI ALERT — Reactor ${alert.reactor_id} ${alert.alert_type}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: white;">
          <h1 style="color: ${alert.alert_type === 'CRITICAL' ? '#ff4444' : '#ffaa00'};">
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
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email alert sent for Reactor ${alert.reactor_id}`);
  } catch (error) {
    console.log('❌ Email error:', error.message);
  }
};

// GET all alerts — newest first
const getAllAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .sort({ timestamp: -1 })
      .limit(50);
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
      { new: true }
    );
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json({ success: true, alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllAlerts,
  resolveAlert,
  sendEmailAlert
};