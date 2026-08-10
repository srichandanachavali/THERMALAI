const express = require('express');
const router = express.Router();
const { login, register, logout } = require('../controllers/authController');
const { verifyToken, adminOnly } = require('../middleware/auth');
const { authLimiter } = require('../utils/rateLimit');

router.post('/login', authLimiter, login);
router.post('/register', verifyToken, adminOnly, register);
router.post('/logout', verifyToken, logout);

module.exports = router;
