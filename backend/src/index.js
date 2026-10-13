import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './lib/db.js';
import { initSocket } from './lib/socket.js';
import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);

// Initialise Socket.IO before request handlers
initSocket(httpServer);

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '16mb' }));
app.use(cookieParser());

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// ── Production static serving ─────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));

  // SPA fallback — send index.html for any unmatched route
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 ChatKaro running on http://localhost:${PORT}`);
    console.log(`   Env        : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Frontend   : ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
  });
});
