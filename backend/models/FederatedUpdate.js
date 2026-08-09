const mongoose = require('mongoose');

const FederatedUpdateSchema = new mongoose.Schema({
  reactor_id: { type: String, required: true },
  plant_id: { type: String },
  delta: { type: [Number], required: true },
  n_samples: { type: Number, required: true },
  applied: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FederatedUpdate', FederatedUpdateSchema);
