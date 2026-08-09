const FederatedUpdate = require('../models/FederatedUpdate');
const logger = require('../logger');

const AGGREGATION_WINDOW = 10;

const _isValidDelta = (delta) =>
  Array.isArray(delta) &&
  delta.length > 0 &&
  delta.every((d) => typeof d === 'number' && Number.isFinite(d));

// POST /api/federated/submit-update — admin only (guard applied in routes)
const submitUpdate = async (req, res) => {
  try {
    const { reactor_id, plant_id, delta, n_samples, timestamp } = req.body || {};

    if (!reactor_id || !Array.isArray(delta) || !_isValidDelta(delta)) {
      return res.status(400).json({ error: 'Invalid gradient update payload' });
    }
    if (typeof n_samples !== 'number' || n_samples <= 0) {
      return res.status(400).json({ error: 'n_samples must be a positive number' });
    }

    const doc = await FederatedUpdate.create({
      reactor_id,
      plant_id: plant_id || null,
      delta,
      n_samples,
      timestamp: timestamp ? new Date(timestamp) : undefined,
      applied: false,
    });

    logger.info(`Federated gradient update stored for reactor ${reactor_id}`);
    res.status(201).json({ success: true, id: doc._id, applied: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/federated/global-weights — average the last N submitted deltas
const getGlobalWeights = async (req, res) => {
  try {
    const updates = await FederatedUpdate.find()
      .sort({ timestamp: -1 })
      .limit(AGGREGATION_WINDOW);

    if (updates.length === 0) {
      return res.json({
        success: true,
        global_weights: [],
        n_contributors: 0,
        last_updated: null,
      });
    }

    const width = updates[0].delta.length;
    const sums = new Array(width).fill(0);
    for (const u of updates) {
      for (let i = 0; i < width; i += 1) {
        sums[i] += u.delta[i];
      }
    }
    const global_weights = sums.map((s) => Math.round(s / updates.length * 1000000) / 1000000);

    res.json({
      success: true,
      global_weights,
      n_contributors: updates.length,
      last_updated: updates[0].timestamp,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { submitUpdate, getGlobalWeights };
