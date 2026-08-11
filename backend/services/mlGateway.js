const axios = require('axios');

const ML_URL = process.env.ML_URL || 'http://localhost:5001';
const ML_API_KEY = process.env.ML_API_KEY || '';

// Bearer the Flask service's API-key gate (see ml-model/app.py). Sent on every
// call when configured; when ML_API_KEY is empty the Flask gate is disabled.
const headers = () => (ML_API_KEY ? { 'X-ML-Key': ML_API_KEY } : {});

// IEC 61511 sensor defaults — spread so old callers keep working.
const SENSOR_DEFAULTS = {
  flow_rate: 150,
  material_level: 75,
  gas_concentration: 0,
  ph_level: 7.0,
  emissions_co2_ppm: 400
};

function withSensors(reading) {
  return {
    ...reading,
    flow_rate: reading.flow_rate ?? SENSOR_DEFAULTS.flow_rate,
    material_level: reading.material_level ?? SENSOR_DEFAULTS.material_level,
    gas_concentration: reading.gas_concentration ?? SENSOR_DEFAULTS.gas_concentration,
    ph_level: reading.ph_level ?? SENSOR_DEFAULTS.ph_level,
    emissions_co2_ppm: reading.emissions_co2_ppm ?? SENSOR_DEFAULTS.emissions_co2_ppm
  };
}

async function predictRF(reading) {
  const { data } = await axios.post(`${ML_URL}/predict`, withSensors(reading), { headers: headers() });
  return data;
}

async function predictLSTM(reading) {
  const { data } = await axios.post(`${ML_URL}/predict-lstm`, withSensors(reading), { headers: headers() });
  return data;
}

async function predictXGB(reading) {
  const { data } = await axios.post(`${ML_URL}/predict-xgb`, withSensors(reading), { headers: headers() });
  return data;
}

async function predictPhysics(reading) {
  const { data } = await axios.post(`${ML_URL}/predict-physics`, withSensors(reading), { headers: headers() });
  return data;
}

async function predictTime(reading, riskScore, status) {
  const { data } = await axios.post(`${ML_URL}/predict-time`, {
    ...reading,
    risk_score: riskScore,
    status
  }, { headers: headers() });
  return data;
}

async function explain(reading, riskScore) {
  const { data } = await axios.post(`${ML_URL}/explain`, {
    ...reading,
    risk_score: riskScore
  }, { headers: headers() });
  return data;
}

async function simulate(reading) {
  const { data } = await axios.post(`${ML_URL}/simulate`, {
    reactor_id: reading.reactor_id,
    current_state: reading,
    reactor_type: reading.reactor_type || 'nitration'
  }, { headers: headers() });
  return data;
}

async function predictMaintenance(reactorId, readings) {
  const { data } = await axios.post(`${ML_URL}/maintenance-bulk`, {
    reactor_id: reactorId,
    readings
  }, { headers: headers() });
  return data;
}

module.exports = {
  ML_URL,
  SENSOR_DEFAULTS,
  withSensors,
  predictRF,
  predictLSTM,
  predictXGB,
  predictPhysics,
  predictTime,
  explain,
  simulate,
  predictMaintenance
};
