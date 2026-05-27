const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./db');
const binsRouter = require('./routes/bins');
const Bin = require('./models/Bin');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use((req, res, next) => { req.io = io; next(); });
app.use('/api/bins', binsRouter);

const PORT = process.env.PORT || 3000;

// Handle WebSocket communication
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // Device registration
  socket.on('register', (data) => {
    console.log(`ESP32 Registered: ${data.deviceId}`);
  });

  // ESP32 sends data continuously
  socket.on('esp32:data', async (payload) => {
    try {
      const { deviceId, capacity, name, location } = payload;
      if (!deviceId) return;

      const update = {
        lastUpdated: new Date(),
        capacity: {
          dry: capacity?.dry ?? 0,
          wet: capacity?.wet ?? 0,
         // e_waste: capacity?.e_waste ?? 0
        }
      };
      if (name) update.name = name;
      if (location) update.location = { type: 'Point', coordinates: [location.lng, location.lat] };

      const bin = await Bin.findOneAndUpdate(
        { deviceId },
        { $set: update },
        { new: true, upsert: true }
      );

      io.emit('bin:update', bin);
    } catch (err) {
      console.error('Data update error:', err);
    }
  });

  socket.on('dashboard:init', async () => {
    const bins = await Bin.find().sort({ lastUpdated: -1 });
    socket.emit('dashboard:initData', bins);
  });

  socket.on('disconnect', () => console.log('❌ Disconnected:', socket.id));
});

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
