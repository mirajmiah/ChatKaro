// ChatKaro Desktop PWA Service Worker
const CACHE_NAME = 'chatkaro-desktop-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass API calls, socket.io, and file downloads
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/download')
  ) {
    return;
  }

  // Network-first strategy
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        return (await caches.match('/index.html')) || Response.error();
      }
      return Response.error();
    })
  );
});
