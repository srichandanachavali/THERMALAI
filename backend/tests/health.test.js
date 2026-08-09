'use strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'thermalai_test_secret';
process.env.ML_URL = 'http://localhost:5001';

// /health probes the ML service via axios — mock it so no real network call.
jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: { status: 'ok' } }),
  post: jest.fn(),
}));

const axios = require('axios');
const request = require('supertest');
const { app } = require('../server');

describe('GET /health', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 200 with status:ok when ML is reachable', async () => {
    axios.get.mockResolvedValue({ data: { status: 'ok' } });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.ml).toBe('ok');
  });

  it('returns 503 with ml:down when ML is unreachable', async () => {
    axios.get.mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('ok');
    expect(res.body.ml).toBe('down');
  });
});
