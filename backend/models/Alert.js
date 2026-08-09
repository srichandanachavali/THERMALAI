const mongoose = require("mongoose");

const AlertSchema = new mongoose.Schema({
  reactor_id: { type: String, required: true },
  plant_id: { type: String },
  alert_type: { type: String, enum: ["WARNING", "CRITICAL"], required: true },
  risk_score: { type: Number, required: true },
  temperature: { type: Number, required: true },
  pressure: { type: Number, required: true },
  message: { type: String, required: true },
  top_drivers: { type: Array, default: [] },
  // IEC 61511 SIL banding
  sil_level: { type: String, default: null },
  recommended_action: { type: String, default: '' },
  resolved: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  // IEC 61511 sensor additions
  flow_rate: { type: Number, default: 150 },
  material_level: { type: Number, default: 75 },
  gas_concentration: { type: Number, default: 0 },
  ph_level: { type: Number, default: 7.0 },
  emissions_co2_ppm: { type: Number, default: 400 },
  parameter_alerts: [{ param: String, value: Number, severity: String, reason: String }],
});

module.exports = mongoose.model("Alert", AlertSchema);
