const Alert = require("../models/Alert");
const AuditLog = require("../models/AuditLog");
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
  const topDriver = (alert.top_drivers && alert.top_drivers[0]);
  const driverLine = topDriver
    ? ` — driven by: ${topDriver.sensor} ${topDriver.current_value}`
    : '';
  // IEC 61511 sensor additions
  let extraLines = '';
  if (alert.gas_concentration > 25) {
    extraLines += `\n🚨 GAS: ${alert.gas_concentration}ppm`;
  }
  if (alert.ph_level < 4 || alert.ph_level > 10) {
    extraLines += `\nPH: ${alert.ph_level}`;
  }
  if (alert.material_level < 10) {
    extraLines += `\nTANK: ${alert.material_level}%`;
  }
  try {
    await twilioClient.messages.create({
      body: `🚨 ThermalAI ALERT\nReactor ${alert.reactor_id}: ${alert.alert_type}\nRisk Score: ${alert.risk_score}%\nTemp: ${alert.temperature}°C\nImmediate action required!${driverLine}${extraLines}`,
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
          <h1 style="color: ${alert.alert_type === "CRITICAL" ? "#ff4444" : "#ffaa00"};">⚠️ ${alert.alert_type} ALERT</h1>
          <h2>Reactor ${alert.reactor_id}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #333;"><td style="padding: 10px; color: #aaa;">Risk Score</td><td style="padding: 10px; font-size: 24px; font-weight: bold; color: #ff4444;">${alert.risk_score}%</td></tr>
            <tr><td style="padding: 10px; color: #aaa;">Temperature</td><td style="padding: 10px;">${alert.temperature}°C</td></tr>
            <tr style="background: #333;"><td style="padding: 10px; color: #aaa;">Pressure</td><td style="padding: 10px;">${alert.pressure} bar</td></tr>
            <tr><td style="padding: 10px; color: #aaa;">Message</td><td style="padding: 10px;">${alert.message}</td></tr>
            <tr style="background: #333;"><td style="padding: 10px; color: #aaa;">Flow Rate</td><td style="padding: 10px;">${alert.flow_rate ?? '—'} L/min</td></tr>
            <tr><td style="padding: 10px; color: #aaa;">Material Level</td><td style="padding: 10px;">${alert.material_level ?? '—'}%</td></tr>
            <tr style="background: #333;"><td style="padding: 10px; color: #aaa;">Gas Concentration</td><td style="padding: 10px;${(alert.gas_concentration ?? 0) > 25 ? ' color:#ff4444;font-weight:bold;' : ''}">${alert.gas_concentration ?? 0} ppm</td></tr>
            <tr><td style="padding: 10px; color: #aaa;">pH Level</td><td style="padding: 10px;${(alert.ph_level ?? 7) < 3 || (alert.ph_level ?? 7) > 11 ? ' color:#ff4444;font-weight:bold;' : ((alert.ph_level ?? 7) < 4 || (alert.ph_level ?? 7) > 10 ? ' color:#ffaa00;' : '')}">${alert.ph_level ?? 7}</td></tr>
            <tr style="background: #333;"><td style="padding: 10px; color: #aaa;">CO₂ Emissions</td><td style="padding: 10px;">${alert.emissions_co2_ppm ?? 400} ppm</td></tr>
            <tr><td style="padding: 10px; color: #aaa;">Time</td><td style="padding: 10px;">${new Date().toLocaleString()}</td></tr>
            <tr style="background: #333;"><td style="padding: 10px; color: #aaa;">SIL Classification</td><td style="padding: 10px; font-size: 18px; font-weight: bold;${(alert.sil_level === 'SIL-2' || alert.sil_level === 'SIL-3') ? ' color:#ff4444;' : ''}">${alert.sil_level || '—'}</td></tr>
          </table>
          ${alert.recommended_action ? `<div style="background: ${(alert.sil_level === 'SIL-2' || alert.sil_level === 'SIL-3') ? '#2a1a1a' : '#1a2a1a'}; padding: 10px; margin-top: 16px; border: 1px solid #444; border-left: 4px solid ${(alert.sil_level === 'SIL-2' || alert.sil_level === 'SIL-3') ? '#ff4444' : '#ffaa00'};"><b style="color: #ffaa00;">⚠️ Recommended Action:</b> <span style="color: white;">${alert.recommended_action}</span></div>` : ''}
          ${(alert.parameter_alerts && alert.parameter_alerts.length) ? `<div style="background: #2a1a1a; padding: 10px; margin-top: 20px; border: 1px solid #444;"><b style="color: #ff4444;">⚠️ Parameter Alerts:</b><ul style="color: white; margin-top: 8px;">${alert.parameter_alerts.map(p => `<li><strong>${p.param.replace(/_/g, ' ')}</strong> (${p.severity}): ${p.reason} — value ${p.value}</li>`).join('')}</ul></div>` : ''}
          ${(alert.top_drivers && alert.top_drivers.length) ? `<h3 style="color: #aaa; margin-top: 20px;">Why this alert?</h3><ul style="color: white;">${alert.top_drivers.map(d => `<li><strong>${d.sensor.replace(/_/g, ' ')}</strong>: ${d.direction} (${d.contribution}) — current value ${d.current_value}</li>`).join('')}</ul>` : ''}
          <p style="color: #ff4444; margin-top: 20px;">⚡ Immediate action required — ThermalAI Prevention System</p>
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
    // Append-only audit trail for the resolve action — never blocks response.
    AuditLog.appendOnly({
      event_type: 'ALERT_RESOLVED',
      actor: req.user?.id || req.user?.username || 'SYSTEM',
      reactor_id: alert.reactor_id,
      plant_id: alert.plant_id,
      payload: { alert_id: alert._id },
    }).catch((err) => logger.warn(`Audit log write failed: ${err.message}`));
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
