import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './lib/db.js';
import { initSocket } from './lib/socket.js';
import { SERVER_COMMIT, SERVER_START_TIME } from './lib/version.js';
import { startKeepAlive } from './lib/keepAlive.js';
import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);

// Render runs behind a reverse proxy. Trust the first proxy hop so
// express-rate-limit can determine client IPs correctly in production.
if (process.env.RENDER) {
  app.set('trust proxy', 1);
}

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

// Compatibility alias: handles requests sent without the /api prefix
app.use('/auth', authRoutes);
app.use('/messages', messageRoutes);

// Lightweight health & ping endpoints for Render keep-alive and uptime monitors
app.get(['/api/ping', '/ping', '/api/health', '/health'], (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.status(200).json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Version endpoint for client auto-refresh upon Render deployment/commit
app.get(['/api/version', '/version'], (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({
    commit: process.env.RENDER_GIT_COMMIT || SERVER_COMMIT,
    buildTime: SERVER_START_TIME,
  });
});

// Serve the APK with explicit download headers instead of relying on the
// frontend static-file handler, which can leave some mobile browsers stuck at 100%.
app.get('/download/ChatKaro.apk', (_req, res) => {
  const apkPath = path.resolve(__dirname, '../../frontend/dist/ChatKaro.apk');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Cache-Control', 'no-store, no-transform');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.download(apkPath, 'ChatKaro.apk', (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ message: 'ChatKaro APK is not available yet. Please try again after deployment.' });
    }
  });
});

// ── Production static serving ─────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  app.use(
    express.static(frontendDist, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );

  // SPA fallback — send index.html with zero-cache headers so updates are instant
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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
    startKeepAlive();
  });
});
