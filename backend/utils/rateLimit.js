// API rate limiting (audit 1E). The auth limiter throttles credential
// brute-forcing hard; the general limiter bounds abusive load on the platform.

const rateLimit = require('express-rate-limit');

// Login: 10 attempts per 15 min per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

// Everything else: 200 requests per minute per IP.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

module.exports = { authLimiter, generalLimiter };
