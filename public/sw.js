// RalphTV Watch - Service Worker
const CACHE_NAME = 'ralphtv-watch-v2';
const STATIC_ASSETS = [
  '/',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Track stream status
let wasStreaming = false;
let relayUrl = '';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches and start monitoring
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
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
      .then(() => {
        // Start monitoring stream status
        startStreamMonitoring();
      })
  );
});

// Check stream status periodically
function startStreamMonitoring() {
  // Check every 30 seconds
  setInterval(() => {
    checkStreamStatus();
  }, 30000);

  // Check immediately
  checkStreamStatus();
}

async function checkStreamStatus() {
  try {
    // Get relay URL from clients
    const clients = await self.clients.matchAll();
    if (clients.length === 0) return;

    // Try to get relay URL from message or use stored value
    if (!relayUrl) {
      // Default relay URL - will be set by main app
      return;
    }

    const response = await fetch(`${relayUrl}/api/status`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) return;

    const data = await response.json();
    const isStreaming = data.streaming === true;

    // Stream just went live!
    if (isStreaming && !wasStreaming) {
      console.log('[SW] Stream went live! Showing notification...');
      showLiveNotification();
    }

    wasStreaming = isStreaming;
  } catch (error) {
    console.log('[SW] Stream check failed:', error.message);
  }
}

function showLiveNotification() {
  const notificationOptions = {
    body: 'RalphTV is now streaming live!',
    icon: '/icon-192.png',
    badge: '/icon-180.png',
    vibrate: [200, 100, 200],
    tag: 'stream-live',
    requireInteraction: false,
    actions: [
      {
        action: 'watch',
        title: 'Watch Now'
      }
    ]
  };

  self.registration.showNotification('🔴 RalphTV Live', notificationOptions);
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'watch' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes('/') && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if not
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Receive messages from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_RELAY_URL') {
    relayUrl = event.data.url;
    console.log('[SW] Relay URL set to:', relayUrl);
  }
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
