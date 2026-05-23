'use strict';

// Must be set before any require so jwt.sign/verify works in the controller.
process.env.JWT_SECRET = 'thermalai_test_secret';
process.env.NODE_ENV = 'test';

// authController only requires User + jsonwebtoken — no nodemailer/twilio needed.
jest.mock('../models/User', () => {
  const MockUser = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({}),
  }));
  MockUser.findOne = jest.fn();
  MockUser.deleteOne = jest.fn().mockResolvedValue({});
  MockUser.collection = { dropIndex: jest.fn().mockResolvedValue({}) };
  return MockUser;
});

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authRoutes = require('../routes/authRoutes');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

describe('POST /api/auth/login', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  it('returns 200 and a signed token for valid credentials', async () => {
    User.findOne.mockResolvedValue({
      username: 'admin',
      role: 'admin',
      name: 'Plant Administrator',
      comparePassword: jest.fn().mockResolvedValue(true),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({ username: 'admin', role: 'admin' });

    // Token must be verifiable with the correct secret.
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.role).toBe('admin');
  });

  it('returns 401 for a wrong password', async () => {
    User.findOne.mockResolvedValue({
      username: 'admin',
      role: 'admin',
      name: 'Plant Administrator',
      comparePassword: jest.fn().mockResolvedValue(false),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid username or password');
    expect(res.body.token).toBeUndefined();
  });

  it('returns 401 when the username does not exist', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ghost', password: 'anything' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid username or password');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin' }); // no password

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

describe('POST /api/auth/register', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newuser', password: 'pass123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  it('returns 403 when the token belongs to a non-admin user', async () => {
    // Sign a valid token for an operator — verifyToken passes, adminOnly rejects.
    const operatorToken = jwt.sign(
      { username: 'operator', role: 'operator', name: 'Plant Operator' },
      process.env.JWT_SECRET
    );

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ username: 'newuser', password: 'pass123' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Admin access required');
  });
});
