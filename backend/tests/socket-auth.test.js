'use strict';

// Socket.io handshake auth: connections without a valid JWT must be refused
// at handshake. Split out of security.test.js to keep each file under the
// repo's 8000-byte guardrail.

process.env.JWT_SECRET = 'thermalai_test_secret';
process.env.NODE_ENV = 'test';
process.env.ML_URL = 'http://localhost:5001';

const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');

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
