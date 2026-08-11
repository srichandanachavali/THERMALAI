'use strict';

process.env.JWT_SECRET = 'thermalai_test_secret';
process.env.NODE_ENV = 'test';

jest.mock('../models/AuditLog', () => {
  const log = (over = {}) => ({
    event_type: 'REACTOR_READING',
    actor: 'SYSTEM',
    reactor_id: 'R-101',
    plant_id: 'PLANT_ALPHA',
    risk_score: 42,
    timestamp: new Date('2026-08-09T12:00:00Z'),
    hash: 'abc123',
    ...over,
  });
  const chain = () => ({
    sort: jest.fn(() => chain()),
    skip: jest.fn(() => chain()),
    limit: jest.fn(() => Promise.resolve([log(), log()])),
    cursor: jest.fn(() =>
      (async function* () {
        yield log();
        yield log({ event_type: 'USER_LOGIN', actor: 'u1' });
      })()
    ),
  });
  return {
    appendOnly: jest.fn().mockResolvedValue({}),
    countDocuments: jest.fn().mockResolvedValue(2),
    find: jest.fn(() => chain()),
  };
});

const request = require('supertest');
const express = require('express');
const auditRoutes = require('../routes/auditRoutes');
const { adminHeaders, operatorHeaders } = require('./helpers/tokens');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/audit', auditRoutes);
  return app;
}

describe('GET /api/audit — admin only', () => {
  const app = buildApp();

  it('rejects operators with 403', async () => {
    const res = await request(app).get('/api/audit').set(operatorHeaders());
    expect(res.status).toBe(403);
  });

  it('rejects anonymous with 401', async () => {
    const res = await request(app).get('/api/audit');
    expect(res.status).toBe(401);
  });

  it('returns paginated logs for admin', async () => {
    const res = await request(app).get('/api/audit?limit=2').set(adminHeaders());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(Array.isArray(res.body.logs)).toBe(true);
  });
});

describe('GET /api/audit/export.csv — streams CSV', () => {
  const app = buildApp();

  it('rejects non-admin with 403', async () => {
    const res = await request(app).get('/api/audit/export.csv').set(operatorHeaders());
    expect(res.status).toBe(403);
  });

  it('returns CSV attachment with header row and rows', async () => {
    const res = await request(app).get('/api/audit/export.csv').set(adminHeaders());
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename=thermalai-audit-');
    const lines = res.text.trim().split('\n');
    expect(lines[0]).toBe('timestamp,event_type,actor,reactor_id,plant_id,risk_score,hash');
    expect(lines.length).toBeGreaterThan(1);
  });
});
