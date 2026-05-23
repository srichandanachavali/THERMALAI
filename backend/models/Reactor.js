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

// TTL index: MongoDB automatically deletes documents 7 days after their
// timestamp. Prevents unbounded collection growth (5 reactors × ~30 reads/min
// = ~216,000 documents/day without this).
ReactorSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

// Compound index for getReactorHistory — covers the { reactor_id } filter
// and { timestamp: -1 } sort in a single index scan, avoiding a full collection scan.
ReactorSchema.index({ reactor_id: 1, timestamp: -1 });

module.exports = mongoose.model("Reactor", ReactorSchema);
