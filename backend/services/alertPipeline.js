const Alert = require("../models/Alert");
const plantService = require("./plantService");
const logger = require("../logger");
const { sendEmailAlert, sendSMSAlert } = require("../controllers/alertController");

if (!global.smsCooldown) global.smsCooldown = {};
const SMS_COOLDOWN_MS = 5 * 60 * 1000;

// Persist + broadcast an alert, then notify operators on CRITICAL (rate-limited).
// bypassCooldown (SIL-3, risk >= 85) re-alerts immediately despite a recent SMS.
async function createAndNotifyAlert({ req, alertData, bypassCooldown = false }) {
  const alert = new Alert(alertData);
  await alert.save();
  const alertRoom = plantService.roomForPlant(alert.plant_id);
  req.io.to(alertRoom).emit("new_alert", alert);

  if (alert.alert_type === "CRITICAL") {
    const now = Date.now();
    const lastSMS = global.smsCooldown[alert.reactor_id] || 0;
    if (bypassCooldown || now - lastSMS > SMS_COOLDOWN_MS) {
      await sendSMSAlert(alert);
      await sendEmailAlert(alert);
      global.smsCooldown[alert.reactor_id] = now;
    }
  }
  logger.info(`Alert created for Reactor ${alert.reactor_id}`);
  return alert;
}

module.exports = { createAndNotifyAlert };
