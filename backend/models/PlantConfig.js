const mongoose = require("mongoose");

const ReactorConfigSchema = new mongoose.Schema(
  {
    reactor_id: { type: String, required: true },
    reactor_type: {
      type: String,
      enum: ["nitration", "hydrogenation", "lithiation", "general"],
      default: "general",
    },
    sensor_mode: {
      type: String,
      enum: ["simulate", "modbus", "mqtt", "opcua"],
      default: "simulate",
    },
    modbus_config: { type: mongoose.Schema.Types.Mixed },
    mqtt_topic: { type: String },
    sil_target: {
      type: String,
      enum: ["SIL-1", "SIL-2", "SIL-3"],
      default: "SIL-1",
    },
  },
  { _id: false }
);

const ContactSchema = new mongoose.Schema(
  {
    name: { type: String },
    role: { type: String },
    email: { type: String },
    phone: { type: String },
    alert_types: { type: [String], default: ["WARNING", "CRITICAL"] },
  },
  { _id: false }
);

// PlantConfig — the authoritative record of a plant + its reactors on the
// ThermalAI network, written by the onboarding API and read by plantRoutes.
const PlantConfigSchema = new mongoose.Schema(
  {
    plant_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    location: { type: String },
    city: { type: String },
    state: { type: String },
    type: {
      type: String,
      enum: ["Chemical", "Pharmaceutical", "Petroleum", "Agrochem", "Other"],
      default: "Other",
    },
    reactors: { type: [ReactorConfigSchema], default: [] },
    contacts: { type: [ContactSchema], default: [] },
    subscription_tier: {
      type: String,
      enum: ["pilot", "standard", "enterprise"],
      default: "pilot",
    },
    // Per-plant credential issued to the edge agent for authenticated streaming.
    api_key: { type: String },
    onboarded_at: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
  },
  { timestamps: false }
);

PlantConfigSchema.index({ plant_id: 1 }, { unique: true });

module.exports = mongoose.model("PlantConfig", PlantConfigSchema);
