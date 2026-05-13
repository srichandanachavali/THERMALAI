const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');
const { verifyToken, adminOnly } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', verifyToken, adminOnly, register);

module.exports = router;
