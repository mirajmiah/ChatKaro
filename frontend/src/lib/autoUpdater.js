import api from './axios.js';
import toast from 'react-hot-toast';
import { translateCurrent } from './i18n.js';

// Injected at build time by Vite
const CLIENT_COMMIT = typeof __APP_COMMIT_HASH__ !== 'undefined' ? __APP_COMMIT_HASH__ : null;

let isReloading = false;
let checkInterval = null;
let boundSocket = null;

export const triggerAutoRefresh = (incomingCommit) => {
  if (isReloading) return;
  // Never reload in local development mode with Vite HMR
  if (import.meta.env.DEV) return;
  if (!incomingCommit || !CLIENT_COMMIT) return;

  // If incoming commit doesn't match client's current commit
  if (incomingCommit.slice(0, 7) !== CLIENT_COMMIT.slice(0, 7)) {
    isReloading = true;
    toast(translateCurrent('ChatKaro updated. Refreshing...'), {
      icon: '🔄',
      duration: 3000,
      id: 'chatkaro-auto-refresh-toast',
    });

    setTimeout(() => {
      window.location.reload();
    }, 1200);
  }
};

export const checkForUpdates = async () => {
  if (isReloading || import.meta.env.DEV) return;
  try {
    const res = await api.get('/version', {
      params: { _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.data?.commit) {
      triggerAutoRefresh(res.data.commit);
    }
  } catch {
    // Ignore transient network errors during server rebuild/reboot
  }
};

const handlePreloadError = () => {
  if (!isReloading) {
    isReloading = true;
    window.location.reload();
  }
};

export const initAutoUpdater = (socket) => {
  // 1. Instant check on new deployment reconnection via Socket.IO
  if (socket && socket !== boundSocket) {
    if (boundSocket) {
      boundSocket.off('appVersion');
    }
    boundSocket = socket;
    socket.on('appVersion', (data) => {
      if (data?.commit) {
        triggerAutoRefresh(data.commit);
      }
    });
  }

  // 2. Periodic background poll (every 45s)
  if (!checkInterval) {
    checkInterval = setInterval(checkForUpdates, 45 * 1000);
  }

  // 3. Tab visibility check (checks immediately when user returns to app)
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      checkForUpdates();
    }
  };
  document.removeEventListener('visibilitychange', handleVisibility);
  document.addEventListener('visibilitychange', handleVisibility);

  // 4. Vite preload chunk failure catcher (e.g. if code-split chunk was replaced)
  window.removeEventListener('vite:preloadError', handlePreloadError);
  window.addEventListener('vite:preloadError', handlePreloadError);
};

