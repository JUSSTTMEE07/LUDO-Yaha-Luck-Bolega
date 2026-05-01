/**
 * server.js – Express + Socket.IO Entry Point
 */

'use strict';

require('dotenv').config();

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const authRoutes = require('./routes/auth');
const registerHandlers = require('./socket/handlers');

const app    = express();
const server = http.createServer(app);

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── REST Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── Socket.IO ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'], credentials: true },
  pingTimeout:  60000,
  pingInterval: 25000,
});

io.on('connection', (socket) => {
  registerHandlers(io, socket);
});

// ── MongoDB ─────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ludo_yaha_luck_bolega';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log(`[db] Connected to MongoDB`))
  .catch((err) => {
    console.error('[db] MongoDB connection error:', err.message);
    // Don't crash — game can work without persistence in dev
  });

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[server] Ludo backend running on http://localhost:${PORT}`);
  console.log(`[server] CORS configured to allow all origins dynamically`);
});
