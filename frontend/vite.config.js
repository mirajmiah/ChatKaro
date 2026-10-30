import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

const resolveCommit = () => {
  if (process.env.RENDER_GIT_COMMIT && process.env.RENDER_GIT_COMMIT.trim()) {
    return process.env.RENDER_GIT_COMMIT.trim();
  }
  if (process.env.GIT_COMMIT && process.env.GIT_COMMIT.trim()) {
    return process.env.GIT_COMMIT.trim();
  }
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'dev';
  }
};

const commitHash = resolveCommit();
const buildTime = new Date().toISOString();

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_COMMIT_HASH__: JSON.stringify(commitHash),
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
  },
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
        },
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
          proxy.on('proxyReqWs', (proxyReq) => proxyReq.removeHeader('origin'));
        },
      },
    },
  },
});
