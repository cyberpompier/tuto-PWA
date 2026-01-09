/* ===============================
   Zen PWA – Service Worker
   =============================== */

const CACHE_NAME = 'zen-pwa-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

/* ---------- INSTALL ---------- */
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
          console.log('[SW] Cached:', asset);
        } catch (err) {
          console.warn('[SW] Failed to cache:', asset);
        }
      }
    })
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');

  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non HTTP(s)
  if (!request.url.startsWith('http')) return;

  // Ignore external requests
  if (!request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    )
  );
});

/* ---------- PUSH ---------- */
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'Zen PWA',
    body: 'Nouvelle notification',
    url: '/'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url }
    }).then(() => {
      console.log('[SW] Notification shown');
    })
  );
});

/* ---------- NOTIFICATION CLICK ---------- */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click');
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
