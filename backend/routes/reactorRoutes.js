const express = require('express');
const router = express.Router();
const {
  getAllReactors,
  getReactorById,
  streamReading,
  getReactorHistory,
  getExplanation,
  getMaintenancePrediction
} = require('../controllers/reactorController');

router.get('/', getAllReactors);
router.post('/stream', streamReading);
router.post('/explain', getExplanation);
router.get('/:id/history', getReactorHistory);
router.get('/:id/maintenance', getMaintenancePrediction);
router.get('/:id', getReactorById);

module.exports = router;