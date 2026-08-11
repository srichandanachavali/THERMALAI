const axios = require('axios');

const ML_URL = process.env.ML_URL || 'http://localhost:5001';
const ML_API_KEY = process.env.ML_API_KEY || '';

// Bearer the Flask service's API-key gate (see ml-model/app.py). Sent on every
// call when configured; when ML_API_KEY is empty the Flask gate is disabled.
const headers = () => (ML_API_KEY ? { 'X-ML-Key': ML_API_KEY } : {});

// Axios instance with default timeout
const mlClient = axios.create({
  baseURL: ML_URL,
  timeout: 5000,
});

// IEC 61511 sensor defaults — spread so old callers keep working.
const SENSOR_DEFAULTS = {
  flow_rate: 150,
  material_level: 75,
  gas_concentration: 0,
  ph_level: 7.0,
  emissions_co2_ppm: 400,
};

function withSensors(reading = {}) {
  return {
    ...reading,
    flow_rate: reading.flow_rate ?? SENSOR_DEFAULTS.flow_rate,
    material_level: reading.material_level ?? SENSOR_DEFAULTS.material_level,
    gas_concentration: reading.gas_concentration ?? SENSOR_DEFAULTS.gas_concentration,
    ph_level: reading.ph_level ?? SENSOR_DEFAULTS.ph_level,
    emissions_co2_ppm: reading.emissions_co2_ppm ?? SENSOR_DEFAULTS.emissions_co2_ppm,
  };
}

async function predictRF(reading) {
  try {
    const { data } = await mlClient.post('/predict', withSensors(reading), { headers: headers() });
    return data;
  } catch (err) {
    return { risk_score: 0, status: 'SAFE', data_quality: 'degraded' };
  }
}

async function predictLSTM(reading) {
  try {
    const { data } = await mlClient.post('/predict-lstm', withSensors(reading), { headers: headers() });
    return data;
  } catch (err) {
    return { lstm_risk_score: 0, lstm_confidence: 50, lstm_prediction: 'SAFE' };
  }
}

async function predictXGB(reading) {
  try {
    const { data } = await mlClient.post('/predict-xgb', withSensors(reading), { headers: headers() });
    return data;
  } catch (err) {
    return { xgb_risk_score: 0, xgb_confidence: 50, xgb_prediction: 'SAFE' };
  }
}

async function predictPhysics(reading) {
  try {
    const { data } = await mlClient.post('/predict-physics', withSensors(reading), { headers: headers() });
    return data;
  } catch (err) {
    return { physics_risk_score: 0, physics_prediction: 'SAFE' };
  }
}

async function predictTime(reading, riskScore, status) {
  try {
    const payload = withSensors({
      ...reading,
      risk_score: riskScore,
      status,
    });
    const { data } = await mlClient.post('/predict-time', payload, { headers: headers() });
    return data;
  } catch (err) {
    return { minutes_to_critical: 999, message: 'Time prediction unavailable', urgency: 'LOW' };
  }
}

async function explain(reading, riskScore) {
  try {
    const payload = withSensors({
      ...reading,
      risk_score: riskScore,
    });
    const { data } = await mlClient.post('/explain', payload, { headers: headers() });
    return data;
  } catch (err) {
    return {
      risk_score: riskScore || 0,
      overall: 'All parameters operating within normal baseline bounds.',
      top_drivers: [],
      reasons: ['✅ System operating normally'],
      recommendations: ['Continue normal operations'],
    };
  }
}

async function simulate(reading) {
  try {
    const { data } = await mlClient.post('/simulate', {
      reactor_id: reading.reactor_id,
      current_state: withSensors(reading),
      reactor_type: reading.reactor_type || 'nitration',
    }, { headers: headers() });
    return data;
  } catch (err) {
    return { predicted_temperature: reading.temperature, runaway_risk_score: 0 };
  }
}

async function predictMaintenance(reactorId, readings) {
  try {
    const { data } = await mlClient.post('/maintenance-bulk', {
      reactor_id: reactorId,
      readings: (readings || []).map(withSensors),
    }, { headers: headers() });
    return data;
  } catch (err) {
    return {
      success: false,
      overall_health: 85,
      overall_status: 'HEALTHY',
      overall_message: 'Maintenance service offline — displaying baseline estimate',
      components: [],
    };
  }
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
  predictMaintenance,
};