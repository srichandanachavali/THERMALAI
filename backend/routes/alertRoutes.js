const express = require('express');
const router = express.Router();
const {
  getAllAlerts,
  resolveAlert
} = require('../controllers/alertController');

router.get('/', getAllAlerts);
router.put('/:id/resolve', resolveAlert);

module.exports = router;