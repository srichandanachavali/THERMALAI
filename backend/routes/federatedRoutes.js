const express = require('express');
const router = express.Router();
const { submitUpdate, getGlobalWeights } = require('../controllers/federatedController');
const { verifyToken, adminOnly } = require('../middleware/auth');

router.post('/submit-update', verifyToken, adminOnly, submitUpdate);
router.get('/global-weights', verifyToken, getGlobalWeights);

module.exports = router;
