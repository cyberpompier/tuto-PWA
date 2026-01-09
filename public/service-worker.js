const CACHE_NAME = 'zen-pwa-v4';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/public/manifest.json',
  '/icon-192.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;
  event.respondWith(
    caches.match(event.request).then((res) => res || fetch(event.request))
  );
});

// --- GESTION PUSH PRODUCTION ---
self.addEventListener('push', function(event) {
  console.log('[SW] Push Received');
  
  let data = { 
    title: 'Zen PWA', 
    body: 'Nouveau message reçu !', 
    url: '/' 
  };

  if (event.data) {
    try {
      const json = event.data.json();
      data = { ...data, ...json };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'zen-broadcast',
    renotify: true,
    data: { url: data.url || '/' },
    // Indispensable pour certains navigateurs mobiles
    actions: [{ action: 'open', title: 'Voir' }]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});