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
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, getAllReactors);
router.post('/stream', verifyToken, streamReading);
router.post('/explain', verifyToken, getExplanation);
router.get('/:id/history', verifyToken, getReactorHistory);
router.get('/:id/maintenance', verifyToken, getMaintenancePrediction);
router.get('/:id', verifyToken, getReactorById);

module.exports = router;
