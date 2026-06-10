const mongoose = require("mongoose");

const AlertSchema = new mongoose.Schema({
  reactor_id: { type: String, required: true },
  plant_id: { type: String },
  alert_type: { type: String, enum: ["WARNING", "CRITICAL"], required: true },
  risk_score: { type: Number, required: true },
  temperature: { type: Number, required: true },
  pressure: { type: Number, required: true },
  message: { type: String, required: true },
  resolved: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Alert", AlertSchema);
