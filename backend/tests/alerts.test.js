'use strict';

process.env.JWT_SECRET = 'thermalai_test_secret';
process.env.NODE_ENV = 'test';

// alertController calls nodemailer.createTransport() and twilio() at module
// level — must mock both before the module is first required.
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue({}) })),
}));

jest.mock('twilio', () =>
  jest.fn(() => ({ messages: { create: jest.fn().mockResolvedValue({}) } }))
);

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
const Alert = require('../models/Alert');
const alertRoutes = require('../routes/alertRoutes');
const { operatorHeaders } = require('./helpers/tokens');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/alerts', alertRoutes);
  return app;
}

// ---------------------------------------------------------------------------
// GET /api/alerts
// ---------------------------------------------------------------------------

describe('GET /api/alerts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an array of alerts', async () => {
    const mockAlerts = [
      {
        _id: 'abc123',
        reactor_id: 'A',
        alert_type: 'WARNING',
        risk_score: 45,
        temperature: 145,
        pressure: 5.1,
        message: 'Reactor A: 45% WARNING risk detected',
        resolved: false,
        timestamp: new Date().toISOString(),
      },
    ];

    Alert.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(mockAlerts),
      }),
    });

    const app = buildApp();
    const res = await request(app).get('/api/alerts').set(operatorHeaders());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].reactor_id).toBe('A');
  });

  it('returns an empty array when there are no alerts', async () => {
    Alert.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([]),
      }),
    });

    const app = buildApp();
    const res = await request(app).get('/api/alerts').set(operatorHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/alerts/:id/resolve
// ---------------------------------------------------------------------------

describe('PUT /api/alerts/:id/resolve', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets resolved to true and returns the updated alert', async () => {
    const resolvedAlert = {
      _id: 'abc123',
      reactor_id: 'B',
      alert_type: 'CRITICAL',
      risk_score: 82,
      temperature: 195,
      pressure: 7.8,
      message: 'Reactor B: 82% CRITICAL risk detected',
      resolved: true,
      timestamp: new Date().toISOString(),
    };

    Alert.findByIdAndUpdate.mockResolvedValue(resolvedAlert);

    const app = buildApp();
    const res = await request(app).put('/api/alerts/abc123/resolve').set(operatorHeaders());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.alert.resolved).toBe(true);
    expect(res.body.alert._id).toBe('abc123');

    // Verify findByIdAndUpdate was called with resolved:true and { new:true }.
    expect(Alert.findByIdAndUpdate).toHaveBeenCalledWith(
      'abc123',
      { resolved: true },
      { new: true }
    );
  });

  it('returns 404 when the alert id does not exist', async () => {
    Alert.findByIdAndUpdate.mockResolvedValue(null);

    const app = buildApp();
    const res = await request(app).put('/api/alerts/nonexistent/resolve').set(operatorHeaders());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Alert not found');
  });
});
