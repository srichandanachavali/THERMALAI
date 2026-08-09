'use strict';

const jwt = require('jsonwebtoken');

function signAdmin() {
  return jwt.sign(
    { username: 'admin', role: 'admin', name: 'Test Admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function signOperator() {
  // Mirrors the seeded operator: scoped to PLANT_ALPHA only.
  return jwt.sign(
    { username: 'operator', role: 'operator', name: 'Test Operator', plants: ['PLANT_ALPHA'] },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const adminHeaders = () => ({ Authorization: `Bearer ${signAdmin()}` });
const operatorHeaders = () => ({ Authorization: `Bearer ${signOperator()}` });

module.exports = { signAdmin, signOperator, adminHeaders, operatorHeaders };
