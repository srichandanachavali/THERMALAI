'use strict';

// Plant onboarding API tests: POST /plant (auth, validation, duplicate, success),
// GET /plants (list + fallback), GET edge-config (download), test-connection.

process.env.JWT_SECRET = 'thermalai_test_secret';
process.env.NODE_ENV = 'test';
process.env.ML_URL = 'http://localhost:5001';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue({}) })),
}));
jest.mock('axios', () => ({ post: jest.fn(), get: jest.fn() }));

jest.mock('../models/PlantConfig', () => {
  const M = jest.fn().mockImplementation((d) => ({
    ...(d || {}),
    save: jest.fn().mockResolvedValue({}),
    toObject: () => (d || {}),
  }));
  M.findOne = jest.fn();
  M.find = jest.fn(() => ({ lean: jest.fn().mockResolvedValue([]) }));
  return M;
});
jest.mock('../models/User', () => {
  const M = jest.fn().mockImplementation((d) => ({ ...(d || {}), save: jest.fn().mockResolvedValue({}) }));
  M.findOne = jest.fn();
  return M;
});
jest.mock('../models/AuditLog', () => ({ appendOnly: jest.fn().mockResolvedValue({}) }));

const request = require('supertest');
const express = require('express');
const PlantConfig = require('../models/PlantConfig');
const User = require('../models/User');
const axios = require('axios');
const onboardingRoutes = require('../routes/onboardingRoutes');

// Mimic server.js mount: requireAuth sets req.user from the Authorization
// header (operator vs admin), then the route's adminOnly gates admin flows.
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (!req.headers.authorization) return res.status(401).json({ error: 'No token provided' });
    const role = req.headers.authorization.includes('operator') ? 'operator' : 'admin';
    req.user = { username: 'admin', role };
    next();
  });
  app.use('/api/onboard', onboardingRoutes);
  return app;
}

const VALID_PLANT = {
  plant_id: 'PLANT_DELTA',
  name: 'Delta Agrochem',
  city: 'Nagpur',
  state: 'Maharashtra',
  type: 'Agrochem',
  reactors: [{ reactor_id: 'R1', reactor_type: 'nitration', sensor_mode: 'simulate', sil_target: 'SIL-2' }],
  contacts: [{ name: 'Ops Lead', email: 'ops@delta.example', alert_types: ['WARNING', 'CRITICAL'] }],
};

describe('POST /api/onboard/plant', () => {
  const app = buildApp();

  beforeEach(() => {
    PlantConfig.findOne.mockResolvedValue(null);
    User.findOne.mockResolvedValue(null);
    PlantConfig.mockClear();
    User.mockClear();
  });

  test('rejects anonymous request with 401', async () => {
    const res = await request(app).post('/api/onboard/plant').send(VALID_PLANT);
    expect(res.status).toBe(401);
  });

  test('rejects operator with 403', async () => {
    const res = await request(app)
      .post('/api/onboard/plant')
      .set('Authorization', 'Bearer operator.token')
      .send(VALID_PLANT);
    expect(res.status).toBe(403);
  });

  test('rejects payload with no reactors', async () => {
    const res = await request(app)
      .post('/api/onboard/plant')
      .set('Authorization', 'Bearer admin.token')
      .send({ ...VALID_PLANT, reactors: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reactor/i);
  });

  test('rejects duplicate plant_id with 409', async () => {
    PlantConfig.findOne.mockResolvedValue({ plant_id: 'PLANT_DELTA' });
    const res = await request(app)
      .post('/api/onboard/plant')
      .set('Authorization', 'Bearer admin.token')
      .send(VALID_PLANT);
    expect(res.status).toBe(409);
  });

  test('onboards successfully and returns api_key + edge config', async () => {
    const res = await request(app)
      .post('/api/onboard/plant')
      .set('Authorization', 'Bearer admin.token')
      .send(VALID_PLANT);
    expect(res.status).toBe(201);
    expect(res.body.plant_id).toBe('PLANT_DELTA');
    expect(typeof res.body.api_key).toBe('string');
    expect(res.body.api_key.length).toBeGreaterThan(16);
    expect(res.body.edge_agent_config.stream_endpoint).toContain('/api/reactors/stream');
    expect(res.body.edge_agent_config.reactors[0].reactor_id).toBe('R1');
    // Operator account created, bound to this plant only.
    const created = User.mock.calls.find(([d]) => d && d.role === 'operator');
    expect(created[0].plants).toEqual(['PLANT_DELTA']);
  });
});

describe('GET /api/onboard/plants', () => {
  const app = buildApp();
  const auth = { Authorization: 'Bearer admin.token' };

  test('returns PlantConfig docs with reactor counts', async () => {
    PlantConfig.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { plant_id: 'PLANT_DELTA', name: 'Delta', type: 'Agrochem', reactors: [{ reactor_id: 'R1' }, { reactor_id: 'R2' }], contacts: [{}] },
      ]),
    });
    const res = await request(app).get('/api/onboard/plants').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].reactor_count).toBe(2);
  });

  test('falls back to hardcoded plants when collection is empty', async () => {
    PlantConfig.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    const res = await request(app).get('/api/onboard/plants').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });
});

describe('GET /api/onboard/plants/:id/edge-config', () => {
  const app = buildApp();
  const auth = { Authorization: 'Bearer admin.token' };

  test('returns downloadable config.json for the plant', async () => {
    PlantConfig.findOne.mockResolvedValue({
      plant_id: 'PLANT_DELTA',
      name: 'Delta',
      api_key: 'k123',
      reactors: [{ reactor_id: 'R1', reactor_type: 'nitration', sensor_mode: 'simulate', sil_target: 'SIL-2' }],
    });
    const res = await request(app).get('/api/onboard/plants/PLANT_DELTA/edge-config').set(auth);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('edge-config-PLANT_DELTA.json');
    expect(res.body.api_key).toBe('k123');
    expect(res.body.reactors[0].reactor_id).toBe('R1');
  });

  test('returns 404 for unknown plant', async () => {
    PlantConfig.findOne.mockResolvedValue(null);
    const res = await request(app).get('/api/onboard/plants/NOPE/edge-config').set(auth);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/onboard/plants/:id/test-connection', () => {
  const app = buildApp();
  const auth = { Authorization: 'Bearer admin.token' };

  test('reports connection_ok for each reactor', async () => {
    PlantConfig.findOne.mockResolvedValue({ plant_id: 'PLANT_DELTA', reactors: [{ reactor_id: 'R1' }] });
    axios.post.mockResolvedValue({ data: { success: true } });
    const res = await request(app).post('/api/onboard/plants/PLANT_DELTA/test-connection').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].connection_ok).toBe(true);
    expect(typeof res.body.results[0].latency_ms).toBe('number');
  });

  test('flags reactor as disconnected on stream failure', async () => {
    PlantConfig.findOne.mockResolvedValue({ plant_id: 'PLANT_DELTA', reactors: [{ reactor_id: 'R1' }] });
    axios.post.mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await request(app).post('/api/onboard/plants/PLANT_DELTA/test-connection').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.results[0].connection_ok).toBe(false);
  });
});
