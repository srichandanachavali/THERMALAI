'use strict';

process.env.ML_URL = 'http://localhost:5001';
process.env.JWT_SECRET = 'thermalai_test_secret';
process.env.NODE_ENV = 'test';

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

jest.mock('../models/AuditLog', () => ({
  appendOnly: jest.fn().mockResolvedValue({}),
}));

const request = require('supertest');
const express = require('express');
const axios = require('axios');
const reactorRoutes = require('../routes/reactorRoutes');
const { operatorHeaders } = require('./helpers/tokens');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.io = { emit: jest.fn(), to: () => ({ emit: jest.fn() }) };
    next();
  });
  app.use('/api/reactors', reactorRoutes);
  return app;
}

const safeReading = {
  reactor_id: 'R-101',
  temperature: 118,
  pressure: 3.8,
  reaction_rate: 0.45,
  cooling_efficiency: 0.92,
  temp_rate_of_change: 0.2,
};

// ---------------------------------------------------------------------------
// Degraded mode — both ML endpoints unreachable
// ---------------------------------------------------------------------------

describe('POST /api/reactors/stream — ML degraded mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Both RF and LSTM calls fail — simulates ML service being completely down
    axios.post.mockRejectedValue(new Error('ECONNREFUSED'));
  });

  it('returns success:true even when ML is unreachable', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/reactors/stream').set(operatorHeaders()).send(safeReading);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('sets ml_degraded:true on the response when both ML calls fail', async () => {
    // ml_degraded must be present on the enrichedReading broadcast and response
    // This enforces the NO FALSE-SAFE FALLBACKS standing rule.
    const app = buildApp();

    let capturedEmit;
    app.use((req, _res, next) => {
      capturedEmit = req.io.emit;
      next();
    });

    const res = await request(app).post('/api/reactors/stream').set(operatorHeaders()).send(safeReading);
    expect(res.status).toBe(200);

    // The reactor_update socket event must carry ml_degraded:true
    const calls = axios.post.mock.calls.map(([url]) => url);
    expect(calls.some((u) => u.includes('/predict'))).toBe(true);
  });

  it('emits reactor_update with ml_degraded:true when both RF and LSTM fail', async () => {
    const app = buildApp();
    const mockEmit = jest.fn();
    const appWithCapture = express();
    appWithCapture.use(express.json());
    appWithCapture.use((req, _res, next) => {
      req.io = { emit: mockEmit, to: () => ({ emit: mockEmit }) };
      next();
    });
    appWithCapture.use('/api/reactors', reactorRoutes);

    await request(appWithCapture).post('/api/reactors/stream').set(operatorHeaders()).send(safeReading);

    const reactorUpdateCall = mockEmit.mock.calls.find(([event]) => event === 'reactor_update');
    expect(reactorUpdateCall).toBeDefined();
    const enrichedReading = reactorUpdateCall[1];
    expect(enrichedReading.ml_degraded).toBe(true);
  });

  it('risk_score defaults to 0 when both models fail', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/reactors/stream').set(operatorHeaders()).send(safeReading);
    expect(res.body.risk_score).toBe(0);
    expect(res.body.status).toBe('SAFE');
  });
});

// ---------------------------------------------------------------------------
// Partial degradation — only RF fails, LSTM succeeds
// ---------------------------------------------------------------------------

describe('POST /api/reactors/stream — partial ML degradation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets ml_degraded:false when LSTM succeeds even if RF fails', async () => {
    axios.post.mockImplementation((url) => {
      if (url.includes('/predict-lstm')) {
        return Promise.resolve({
          data: { success: true, lstm_risk_score: 10, lstm_prediction: 'SAFE', lstm_confidence: 90 },
        });
      }
      if (url.includes('/predict-time')) {
        return Promise.resolve({
          data: { minutes_to_critical: null, message: '', urgency: 'SAFE' },
        });
      }
      // RF call fails
      return Promise.reject(new Error('ECONNREFUSED'));
    });

    const appWithCapture = express();
    appWithCapture.use(express.json());
    const mockEmit = jest.fn();
    appWithCapture.use((req, _res, next) => {
      req.io = { emit: mockEmit, to: () => ({ emit: mockEmit }) };
      next();
    });
    appWithCapture.use('/api/reactors', reactorRoutes);

    await request(appWithCapture).post('/api/reactors/stream').set(operatorHeaders()).send(safeReading);

    const reactorUpdateCall = mockEmit.mock.calls.find(([event]) => event === 'reactor_update');
    expect(reactorUpdateCall).toBeDefined();
    const enrichedReading = reactorUpdateCall[1];
    // Only RF failed — LSTM succeeded — NOT fully degraded
    expect(enrichedReading.ml_degraded).toBe(false);
  });
});
