'use strict';

process.env.ML_URL = 'http://localhost:5001';
process.env.JWT_SECRET = 'thermalai_test_secret';
process.env.NODE_ENV = 'test';

// alertController is imported by reactorController at the top level and calls
// nodemailer.createTransport() + twilio() immediately — must mock both.
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue({}) })),
}));

jest.mock('twilio', () =>
  jest.fn(() => ({ messages: { create: jest.fn().mockResolvedValue({}) } }))
);

jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

jest.mock('../models/Reactor', () => {
  const MockReactor = jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({}),
  }));
  MockReactor.find = jest.fn();
  return MockReactor;
});

jest.mock('../models/Alert', () => {
  const MockAlert = jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({}),
  }));
  MockAlert.find = jest.fn();
  MockAlert.findByIdAndUpdate = jest.fn();
  return MockAlert;
});

const request = require('supertest');
const express = require('express');
const axios = require('axios');
const Reactor = require('../models/Reactor');
const reactorRoutes = require('../routes/reactorRoutes');

// Provide req.io so streamReading's socket.emit calls don't throw.
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.io = { emit: jest.fn() };
    next();
  });
  app.use('/api/reactors', reactorRoutes);
  return app;
}

// ---------------------------------------------------------------------------
// GET /api/reactors
// ---------------------------------------------------------------------------

describe('GET /api/reactors', () => {
  it('returns an array (empty on cold start)', async () => {
    const app = buildApp();

    const res = await request(app).get('/api/reactors');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /api/reactors/stream
// ---------------------------------------------------------------------------

describe('POST /api/reactors/stream', () => {
  const safeReading = {
    reactor_id: 'A',
    temperature: 118,
    pressure: 3.8,
    reaction_rate: 0.45,
    cooling_efficiency: 0.92,
    temp_rate_of_change: 0.2,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Route ML calls by URL path.
    axios.post.mockImplementation((url) => {
      if (url.includes('/predict-lstm')) {
        return Promise.resolve({
          data: {
            success: true,
            lstm_risk_score: 10,
            lstm_prediction: 'SAFE',
            lstm_confidence: 90,
          },
        });
      }
      if (url.includes('/predict-time')) {
        return Promise.resolve({
          data: {
            minutes_to_critical: null,
            message: '✅ Reactor operating safely — no imminent danger',
            urgency: 'SAFE',
          },
        });
      }
      // /predict (Random Forest)
      return Promise.resolve({
        data: { risk_score: 12, status: 'SAFE' },
      });
    });

    Reactor.mockImplementation(() => ({ save: jest.fn().mockResolvedValue({}) }));
  });

  it('returns success:true and a numeric risk_score for a valid reading', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/reactors/stream')
      .send(safeReading);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.risk_score).toBe('number');
    expect(res.body.risk_score).toBeGreaterThanOrEqual(0);
    expect(res.body.risk_score).toBeLessThanOrEqual(100);
  });

  it('returns a valid status string', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/reactors/stream')
      .send(safeReading);

    expect(['SAFE', 'WARNING', 'CRITICAL']).toContain(res.body.status);
  });

  it('calls the RF and LSTM ML endpoints', async () => {
    const app = buildApp();

    await request(app).post('/api/reactors/stream').send(safeReading);

    const calledUrls = axios.post.mock.calls.map(([url]) => url);
    expect(calledUrls.some((u) => u.includes('/predict'))).toBe(true);
    expect(calledUrls.some((u) => u.includes('/predict-lstm'))).toBe(true);
  });

  it('still returns success when ML endpoints are unreachable', async () => {
    // Both model calls fail — controller falls back to score 0 (SAFE).
    axios.post.mockRejectedValue(new Error('ECONNREFUSED'));

    const app = buildApp();

    const res = await request(app)
      .post('/api/reactors/stream')
      .send(safeReading);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /api/reactors/:id/history
// ---------------------------------------------------------------------------

describe('GET /api/reactors/:id/history', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an array of historical readings', async () => {
    const mockHistory = [
      { reactor_id: 'A', temperature: 118, pressure: 3.8, risk_score: 12, status: 'SAFE' },
      { reactor_id: 'A', temperature: 120, pressure: 3.9, risk_score: 15, status: 'SAFE' },
    ];

    Reactor.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(mockHistory),
      }),
    });

    const app = buildApp();

    const res = await request(app).get('/api/reactors/A/history');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].reactor_id).toBe('A');
  });

  it('returns an empty array when the reactor has no history', async () => {
    Reactor.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([]),
      }),
    });

    const app = buildApp();

    const res = await request(app).get('/api/reactors/Z/history');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
