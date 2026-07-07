const express = require('express');
const router = express.Router();
const {
  getAllAlerts,
  resolveAlert
} = require('../controllers/alertController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, getAllAlerts);
router.put('/:id/resolve', verifyToken, resolveAlert);

module.exports = router;
