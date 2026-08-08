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

const http = require('http');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');

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
// Socket.io — handshake auth
// ---------------------------------------------------------------------------

describe('Socket.io handshake auth', () => {
  let httpServer, io, port;

  beforeAll(done => {
    httpServer = http.createServer();
    io = new Server(httpServer, { cors: { origin: 'http://localhost:3000' } });
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
      } catch {
        next(new Error('unauthorized'));
      }
    });
    io.on('connection', s => s.emit('welcome', { ok: true }));
    httpServer.listen(0, () => {
      port = httpServer.address().port;
      done();
    });
  });

  afterAll(done => {
    io.close();
    httpServer.close(done);
  });

  test('tokenless connection is refused with unauthorized error', done => {
    const client = ioClient(`http://localhost:${port}`, { reconnection: false, transports: ['websocket'] });
    client.on('connect_error', err => {
      expect(err.message).toBe('unauthorized');
      client.close();
      done();
    });
    client.on('connect', () => {
      client.close();
      done(new Error('expected connection to be refused'));
    });
  });

  test('invalid token connection is refused', done => {
    const client = ioClient(`http://localhost:${port}`, {
      reconnection: false,
      transports: ['websocket'],
      auth: { token: 'not.a.real.token' },
    });
    client.on('connect_error', err => {
      expect(err.message).toBe('unauthorized');
      client.close();
      done();
    });
    client.on('connect', () => {
      client.close();
      done(new Error('expected connection to be refused'));
    });
  });

  test('valid token connects successfully', done => {
    const token = jwt.sign({ username: 'operator', role: 'operator' }, process.env.JWT_SECRET);
    const client = ioClient(`http://localhost:${port}`, {
      reconnection: false,
      transports: ['websocket'],
      auth: { token },
    });
    client.on('connect', () => {
      client.close();
      done();
    });
    client.on('connect_error', err => {
      client.close();
      done(err);
    });
  });
});
