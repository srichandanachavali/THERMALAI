const express = require('express');
const router = express.Router();
const {
  getAllReactors,
  getReactorById,
  streamReading,
  getReactorHistory
} = require('../controllers/reactorController');

router.get('/', getAllReactors);
router.get('/:id', getReactorById);
router.post('/stream', streamReading);
router.get('/:id/history', getReactorHistory);

module.exports = router;