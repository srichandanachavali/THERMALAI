const Reactor = require('../models/Reactor');
const axios = require('axios');

const ML_URL = process.env.ML_URL || 'http://localhost:5001';

// In-memory cache for maintenance-schedule projections (15-minute TTL).
const scheduleCache = new Map();
const SCHEDULE_TTL_MS = 15 * 60 * 1000;

const getMaintenanceSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const cached = scheduleCache.get(id);
    if (cached && Date.now() - cached.at < SCHEDULE_TTL_MS) {
      return res.json({ ...cached.data, cached: true });
    }

    const history = await Reactor.find({ reactor_id: id })
      .sort({ timestamp: -1 })
      .limit(168);

    if (!history || history.length < 5) {
      return res.json({
        success: false,
        message: `Building data... ${history.length}/5 readings collected`
      });
    }

    const readings = history.reverse().map(r => ({
      timestamp: r.timestamp,
      temperature: r.temperature,
      pressure: r.pressure,
      reaction_rate: r.reaction_rate,
      cooling_efficiency: r.cooling_efficiency,
      risk_score: r.risk_score
    }));

    const response = await axios.post(
      `${ML_URL}/maintenance-schedule`,
      { reactor_id: id, history: readings }
    );

    scheduleCache.set(id, { at: Date.now(), data: response.data });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getMaintenanceSchedule };
