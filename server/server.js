import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';

import authRoutes from './routes/authRoutes.js';
import callRoutes from './routes/callRoutes.js';
import initSocketHandlers from './socket/socketHandlers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Validate required environment variables at startup — fail fast
// ─────────────────────────────────────────────────────────────────────────────
const requiredEnv = ['MONGO_URI', 'JWT_SECRET', 'DAILY_API_KEY'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error('\n' + '='.repeat(60));
  console.error('❌ [FATAL CONFIG ERROR] Missing required environment variables:');
  missingEnv.forEach((key) => console.error(`   - ${key}`));
  console.error('\nPlease populate these variables in your server/.env file.');
  console.error('Refer to server/.env.example for guidance.');
  console.error('='.repeat(60) + '\n');
  process.exit(1);
}

if (process.env.DAILY_API_KEY === 'your_daily_api_key_here') {
  console.warn('\n⚠️ [WARN] DAILY_API_KEY is currently set to placeholder value.');
  console.warn('   Video room creation will require a valid key from https://dashboard.daily.co\n');
}

const app = express();
const httpServer = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ─────────────────────────────────────────────────────────────────────────────
// Socket.io — allow cross-origin from frontend
// ─────────────────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Express middleware
// ─────────────────────────────────────────────────────────────────────────────
app.use(cors({ origin: CLIENT_URL, credentials: true }));
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
