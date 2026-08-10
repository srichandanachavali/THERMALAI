'use strict';

// Auth-negative tests (v1.2.0 security hardening): every mutating/sensitive route
// must reject anonymous requests with 401 and (where roles apply) 403 for lower roles.
// Socket.io connections without a valid JWT must be refused at handshake.

process.env.JWT_SECRET = 'thermalai_test_secret';
process.env.NODE_ENV = 'test';
process.env.ML_URL = 'http://localhost:5001';

// Mock heavy deps the controllers import
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue({}) })),
}));
jest.mock('twilio', () =>
  jest.fn(() => ({ messages: { create: jest.fn().mockResolvedValue({}) } }))
);
jest.mock('axios', () => ({ post: jest.fn(), get: jest.fn() }));

jest.mock('../models/Reactor', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({}) }));
  M.find = jest.fn(() => ({ sort: () => ({ limit: () => Promise.resolve([]) }) }));
  return M;
});
jest.mock('../models/Alert', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({}) }));
  M.find = jest.fn(() => ({ sort: () => ({ limit: () => Promise.resolve([]) }) }));
  M.findByIdAndUpdate = jest.fn().mockResolvedValue({ _id: 'x', resolved: true });
  return M;
});
jest.mock('../models/AuditLog', () => ({
  appendOnly: jest.fn().mockResolvedValue({}),
}));
// Empty PlantConfig collection → plantRoutes falls back to the hardcoded PLANTS
// array, matching the plant-scoping assumptions below.
jest.mock('../models/PlantConfig', () => {
  const M = jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({}) }));
  M.findOne = jest.fn().mockResolvedValue(null);
  M.find = jest.fn(() => ({ lean: () => Promise.resolve([]) }));
  return M;
});

const request = require('supertest');
const express = require('express');

const { verifyToken, adminOnly } = require('../middleware/auth');
const reactorRoutes = require('../routes/reactorRoutes');
const alertRoutes = require('../routes/alertRoutes');
const plantRoutes = require('../routes/plantRoutes');
const { adminHeaders, operatorHeaders } = require('./helpers/tokens');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.io = { emit: jest.fn() }; next(); });
  // Same simulate route shape as server.js
  app.post('/api/simulate/:id', verifyToken, adminOnly, (req, res) => {
    res.json({ success: true, risk_score: 99 });
  });
  app.use('/api/reactors', reactorRoutes);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/plants', plantRoutes);
  return app;
}

// ---------------------------------------------------------------------------
// HTTP — 401 on anonymous requests to every protected route
// ---------------------------------------------------------------------------

describe('Anonymous requests are rejected with 401', () => {
  const app = buildApp();

  test.each([
    ['POST', '/api/simulate/A'],
    ['POST', '/api/reactors/stream'],
    ['POST', '/api/reactors/explain'],
    ['GET',  '/api/reactors'],
    ['GET',  '/api/reactors/A'],
    ['GET',  '/api/reactors/A/history'],
    ['GET',  '/api/reactors/A/maintenance'],
    ['GET',  '/api/alerts'],
    ['PUT',  '/api/alerts/abc123/resolve'],
    ['GET',  '/api/plants/PLANT_ALPHA'],
  ])('%s %s without token → 401', async (method, path) => {
    const res = await request(app)[method.toLowerCase()](path).send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/token/i);
  });

  // GET /api/plants (the list) is intentionally PUBLIC — PlantSelect.js uses it
  // to let users pick a facility before logging in. Single-plant lookup stays protected.
  test('GET /api/plants without token → 200 (public landing list)', async () => {
    const res = await request(app).get('/api/plants').send({});
    expect(res.status).toBe(200);
  });

  test('POST /api/simulate/:id with an invalid token → 401', async () => {
    const res = await request(app)
      .post('/api/simulate/A')
      .set('Authorization', 'Bearer not.a.real.token')
      .send({});
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// HTTP — role enforcement (adminOnly)
// ---------------------------------------------------------------------------

describe('Role enforcement (adminOnly)', () => {
  const app = buildApp();

  test('POST /api/simulate/:id with operator token → 403', async () => {
    const res = await request(app)
      .post('/api/simulate/A')
      .set(operatorHeaders())
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin/i);
  });

  test('POST /api/simulate/:id with admin token → 200', async () => {
    const res = await request(app)
      .post('/api/simulate/A')
      .set(adminHeaders())
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/reactors with operator token → 200 (any authenticated role allowed)', async () => {
    const res = await request(app).get('/api/reactors').set(operatorHeaders());
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Per-plant access control (plantService scoping)
// ---------------------------------------------------------------------------

describe('Per-plant access control', () => {
  const app = buildApp();

  test('public plant list is sanitized (no internal reactor detail)', async () => {
    const res = await request(app).get('/api/plants');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((plant) => {
      expect(plant).not.toHaveProperty('reactors');
      expect(plant).not.toHaveProperty('established');
      expect(plant).not.toHaveProperty('location');
    });
  });

  test('/api/plants/mine scopes operator to PLANT_ALPHA only', async () => {
    const res = await request(app).get('/api/plants/mine').set(operatorHeaders());
    expect(res.status).toBe(200);
    const ids = res.body.map((p) => p.plant_id);
    expect(ids).toEqual(['PLANT_ALPHA']);
  });

  test('/api/plants/mine returns all plants for admin', async () => {
    const res = await request(app).get('/api/plants/mine').set(adminHeaders());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  test('operator cannot fetch a foreign plant detail (403)', async () => {
    const res = await request(app)
      .get('/api/plants/PLANT_BETA')
      .set(operatorHeaders());
    expect(res.status).toBe(403);
  });

  test('operator can fetch their own plant detail (200)', async () => {
    const res = await request(app)
      .get('/api/plants/PLANT_ALPHA')
      .set(operatorHeaders());
    expect(res.status).toBe(200);
  });

  test('operator denied foreign reactor C (PLANT_BETA) → 403', async () => {
    const res = await request(app).get('/api/reactors/C').set(operatorHeaders());
    expect(res.status).toBe(403);
  });
});
