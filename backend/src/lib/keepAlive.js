import https from 'https';
import http from 'http';

let keepAliveInterval = null;

export const startKeepAlive = () => {
  // Only run in production or on Render
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);
  if (!isProduction) {
    return;
  }

  const getTargetUrl = () => {
    let url = (process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || process.env.FRONTEND_URL || '').trim();
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    return url;
  };

  const pingUrl = () => {
    const baseUrl = getTargetUrl();
    if (!baseUrl || !baseUrl.startsWith('http')) {
      return;
    }

    const fullUrl = `${baseUrl}/api/ping`;
    const client = fullUrl.startsWith('https') ? https : http;

    const req = client.get(fullUrl, { timeout: 15000 }, (res) => {
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 400) {
        console.log(`[Keep-Alive] Pinged ${fullUrl} (HTTP ${res.statusCode}) - preventing Render sleep mode.`);
      } else {
        console.warn(`[Keep-Alive] Ping to ${fullUrl} returned HTTP ${res.statusCode}`);
      }
    });

    req.on('error', (err) => {
      console.warn(`[Keep-Alive] Self-ping warning: ${err.message}`);
    });

    req.on('timeout', () => {
      req.destroy();
      console.warn('[Keep-Alive] Self-ping timed out.');
    });
  };

  // Render free tier sleeps after 15 minutes of inactivity; ping every 12 minutes
  const INTERVAL_MS = 12 * 60 * 1000;

  // First ping 1 minute after server boot
  setTimeout(pingUrl, 60 * 1000);

  // Recurring ping
  keepAliveInterval = setInterval(pingUrl, INTERVAL_MS);
};
