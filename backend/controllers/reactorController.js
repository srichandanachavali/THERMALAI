const Reactor = require('../models/Reactor');
const Alert = require('../models/Alert');
const axios = require('axios');
const { sendEmailAlert, sendSMSAlert } = require('./alertController');

let latestReadings = {};

if (!global.smsCooldown) global.smsCooldown = {};

const getAllReactors = async (req, res) => {
  try {
    res.json(Object.values(latestReadings));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getReactorById = async (req, res) => {
  try {
    const reading = latestReadings[req.params.id];
    if (!reading) return res.status(404).json({ error: 'Reactor not found' });
    res.json(reading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getReactorHistory = async (req, res) => {
  try {
    const history = await Reactor.find({ reactor_id: req.params.id })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const streamReading = async (req, res) => {
  try {
    const reading = req.body;

    // Random Forest prediction
    let riskResult = { risk_score: 0, status: 'SAFE' };
    try {
      const aiResponse = await axios.post('http://localhost:5001/predict', reading);
      riskResult = aiResponse.data;
    } catch (err) {
      console.log('⚠️ RF model not available');
    }

    // LSTM prediction
    let lstmResult = { lstm_risk_score: 0, lstm_prediction: 'SAFE', lstm_confidence: 0 };
    try {
      const lstmResponse = await axios.post('http://localhost:5001/predict-lstm', reading);
      if (lstmResponse.data.success) lstmResult = lstmResponse.data;
    } catch (err) {
      console.log('⚠️ LSTM model not available');
    }

    // Ensemble RF 40% + LSTM 60%
    const ensembleScore = Math.round(
      (riskResult.risk_score * 0.4) + (lstmResult.lstm_risk_score * 0.6)
    );
    let ensembleStatus = 'SAFE';
    if (ensembleScore >= 70) ensembleStatus = 'CRITICAL';
    else if (ensembleScore >= 30) ensembleStatus = 'WARNING';

    // Predict time to critical
    let timeResult = { minutes_to_critical: null, message: '', urgency: 'SAFE' };
    try {
      const timeResponse = await axios.post('http://localhost:5001/predict-time', {
        ...reading,
        risk_score: ensembleScore,
        status: ensembleStatus
      });
      timeResult = timeResponse.data;
    } catch (err) {
      console.log('⚠️ Time prediction not available');
    }

    const enrichedReading = {
      ...reading,
      risk_score: ensembleScore,
      rf_score: riskResult.risk_score,
      lstm_score: lstmResult.lstm_risk_score,
      lstm_confidence: lstmResult.lstm_confidence,
      lstm_prediction: lstmResult.lstm_prediction,
      status: ensembleStatus,
      minutes_to_critical: timeResult.minutes_to_critical,
      time_message: timeResult.message,
      time_urgency: timeResult.urgency,
      timestamp: new Date()
    };

    latestReadings[reading.reactor_id] = enrichedReading;

    const reactorDoc = new Reactor(enrichedReading);
    await reactorDoc.save();

    const now = Date.now();
    const lastSMS = global.smsCooldown[reading.reactor_id] || 0;
    const cooldownPeriod = 5 * 60 * 1000;

    if (ensembleStatus === 'WARNING' || ensembleStatus === 'CRITICAL') {
      const alert = new Alert({
        reactor_id: reading.reactor_id,
        alert_type: ensembleStatus,
        risk_score: ensembleScore,
        temperature: reading.temperature,
        pressure: reading.pressure,
        message: `Reactor ${reading.reactor_id}: ${ensembleScore}% ${ensembleStatus} risk detected`
      });
      await alert.save();
      req.io.emit('new_alert', alert);

      if (ensembleStatus === 'CRITICAL' && (now - lastSMS) > cooldownPeriod) {
        await sendSMSAlert(alert);
        await sendEmailAlert(alert);
        global.smsCooldown[reading.reactor_id] = now;
      }
    }

    req.io.emit('reactor_update', enrichedReading);
    res.json({ success: true, risk_score: ensembleScore, status: ensembleStatus });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getExplanation = async (req, res) => {
  try {
    const reading = req.body;
    const response = await axios.post('http://localhost:5001/explain', reading);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMaintenancePrediction = async (req, res) => {
  try {
    const { id } = req.params;

    const history = await Reactor.find({ reactor_id: id })
      .sort({ timestamp: -1 })
      .limit(20);

    if (!history || history.length < 5) {
      return res.json({
        success: false,
        message: `Building data... ${history.length}/5 readings collected`
      });
    }

    const readings = history.reverse().map(r => ({
      cooling_efficiency: r.cooling_efficiency,
      pressure: r.pressure,
      reaction_rate: r.reaction_rate,
      temperature: r.temperature
    }));

    const response = await axios.post(
      'http://localhost:5001/maintenance-bulk',
      { reactor_id: id, readings }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllReactors,
  getReactorById,
  streamReading,
  getReactorHistory,
  getExplanation,
  getMaintenancePrediction,
  getLatestReadings: () => latestReadings
};