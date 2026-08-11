'use strict';

process.env.JWT_SECRET = 'thermalai_test_secret';
process.env.NODE_ENV = 'test';

jest.mock('../models/FederatedUpdate', () => {
  const MockFederatedUpdate = jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({}),
  }));
  MockFederatedUpdate.create = jest.fn();
  MockFederatedUpdate.find = jest.fn();
  return MockFederatedUpdate;
});

const request = require('supertest');
const express = require('express');
const FederatedUpdate = require('../models/FederatedUpdate');
const federatedRoutes = require('../routes/federatedRoutes');
const { adminHeaders, operatorHeaders } = require('./helpers/tokens');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/federated', federatedRoutes);
  return app;
}

const VALID_BODY = {
  reactor_id: 'R-101',
  plant_id: 'PLANT_ALPHA',
  delta: [0.1, -0.2, 0.3, 0.05, -0.1, 0.2, -0.05, 0.1, 0.0, 0.0],
  n_samples: 60,
  timestamp: '2026-08-09T00:00:00Z',
};

describe('POST /api/federated/submit-update', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(buildApp()).post('/api/federated/submit-update').send(VALID_BODY);
    expect(res.status).toBe(401);
  });

  it('rejects non-admin users', async () => {
    const res = await request(buildApp())
      .post('/api/federated/submit-update')
      .set(operatorHeaders())
      .send(VALID_BODY);
    expect(res.status).toBe(403);
  });

  it('rejects an invalid delta payload', async () => {
    const res = await request(buildApp())
      .post('/api/federated/submit-update')
      .set(adminHeaders())
      .send({ reactor_id: 'R-101', delta: 'not-an-array', n_samples: 10 });
    expect(res.status).toBe(400);
  });

  it('stores a valid update and returns 201', async () => {
    FederatedUpdate.create.mockResolvedValue({ _id: 'abc123', applied: false });
    const res = await request(buildApp())
      .post('/api/federated/submit-update')
      .set(adminHeaders())
      .send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(FederatedUpdate.create).toHaveBeenCalled();
  });
});

describe('GET /api/federated/global-weights', () => {
  it('requires auth', async () => {
    const res = await request(buildApp()).get('/api/federated/global-weights');
    expect(res.status).toBe(401);
  });

  it('returns empty result when no updates exist', async () => {
    FederatedUpdate.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }) });
    const res = await request(buildApp())
      .get('/api/federated/global-weights')
      .set(adminHeaders());
    expect(res.status).toBe(200);
    expect(res.body.global_weights).toEqual([]);
    expect(res.body.n_contributors).toBe(0);
  });

  it('averages deltas across the latest updates', async () => {
    const updates = [
      { delta: [2, 4, 6], timestamp: new Date('2026-08-09T00:03:00Z') },
      { delta: [0, 2, 4], timestamp: new Date('2026-08-09T00:02:00Z') },
      { delta: [1, 0, 2], timestamp: new Date('2026-08-09T00:01:00Z') },
    ];
    FederatedUpdate.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(updates) }) });
    const res = await request(buildApp())
      .get('/api/federated/global-weights')
      .set(adminHeaders());
    expect(res.status).toBe(200);
    expect(res.body.global_weights).toEqual([1, 2, 4]);
    expect(res.body.n_contributors).toBe(3);
  });
});
