import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';

import authRoutes from './routes/authRoutes.js';
import callRoutes from './routes/callRoutes.js';
import initSocketHandlers from './socket/socketHandlers.js';

const app = express();
const httpServer = http.createServer(app);

// ─────────────────────────────────────────────────────────────────────────────
// Socket.io — allow cross-origin from Vite dev server
// ─────────────────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Express middleware
// ─────────────────────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// REST routes
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/calls', callRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ─────────────────────────────────────────────────────────────────────────────
// Socket.io event handlers (all logic isolated in socketHandlers.js)
// ─────────────────────────────────────────────────────────────────────────────
initSocketHandlers(io);

// ─────────────────────────────────────────────────────────────────────────────
// MongoDB connection → then start HTTP server
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sonar';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('[DB] MongoDB connected successfully');
    httpServer.listen(PORT, () => {
      console.log(`[Server] Sonar server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[DB] MongoDB connection failed:', err.message);
    process.exit(1);
  });
