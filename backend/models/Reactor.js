const mongoose = require("mongoose");

const ReactorSchema = new mongoose.Schema({
  reactor_id: { type: String, required: true },
  temperature: { type: Number, required: true },
  pressure: { type: Number, required: true },
  reaction_rate: { type: Number, required: true },
  cooling_efficiency: { type: Number, required: true },
  temp_rate_of_change: { type: Number, default: 0 },
  risk_score: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["SAFE", "WARNING", "CRITICAL"],
    default: "SAFE",
  },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Reactor", ReactorSchema);
