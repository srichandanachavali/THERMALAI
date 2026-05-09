const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Store latest readings in memory
let latestReadings = {};

app.get('/', (req, res) => {
  res.json({ message: 'ThermalAI Backend Running 🔥' });
});

// Stream endpoint — receives data from Python
app.post('/api/stream', (req, res) => {
  const reading = req.body;
  latestReadings[reading.reactor_id] = reading;
  
  // Broadcast to all connected dashboards
  io.emit('reactor_update', reading);
  
  res.json({ success: true });
});

// Get all latest readings
app.get('/api/reactors', (req, res) => {
  res.json(Object.values(latestReadings));
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB!'))
  .catch((err) => console.log('❌ MongoDB Error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});