const mongoose = require('mongoose');

const PlantSchema = new mongoose.Schema({
  plant_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  location: { type: String, required: true },
  city: { type: String, required: true },
  type: { type: String, required: true },
  reactors: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Plant', PlantSchema);