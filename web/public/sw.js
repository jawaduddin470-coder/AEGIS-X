// AEGIS X — Service Worker (Offline Support)
// Provides offline caching for critical assets and API responses

const CACHE_NAME = 'aegis-x-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// ─── Install: Cache static shell ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[AEGIS SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[AEGIS SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ─── Activate: Clean old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[AEGIS SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[AEGIS SW] Removing old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: Network first, fallback to cache ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and API calls (don't cache live data)
  if (request.method !== 'GET') return;
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// ─── Background Sync: Queue SOS reports when offline ─────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'aegis-sos-sync') {
    console.log('[AEGIS SW] Background sync: SOS reports');
    event.waitUntil(syncPendingReports());
  }
});

async function syncPendingReports() {
  // In a real implementation, this would read from IndexedDB
  // and POST pending SOS reports when connectivity is restored
  console.log('[AEGIS SW] Syncing pending emergency reports...');
}

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'AEGIS X Alert', body: event.data.text() };
  }

  const options = {
    body: data.body || 'New emergency alert from AEGIS X',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'aegis-alert',
    requireInteraction: data.critical || false,
    actions: [
      { action: 'view', title: 'View Alert' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'AEGIS X Emergency Alert', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});
