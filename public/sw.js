// RalphTV Watch - Service Worker
const CACHE_NAME = 'ralphtv-watch-v2';
const STATIC_ASSETS = [
  '/',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - cache static assets, never cache streams
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache HLS streams - always fetch fresh from network
  if (url.pathname.includes('.m3u8') || url.pathname.includes('.ts')) {
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then((response) => {
            // Cache successful GET requests for static assets
            if (event.request.method === 'GET' && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, responseClone));
            }
            return response;
          });
      })
  );
});
