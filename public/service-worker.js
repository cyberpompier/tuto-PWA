const CACHE_NAME = 'zen-pwa-v3';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/public/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force l'activation immédiate du nouveau SW
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Erreur lors du pré-cache des fichiers:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim()) // Prend le contrôle de la page immédiatement
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (!request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Mise à jour en arrière-plan (Stale-While-Revalidate)
        fetch(request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
            }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback si offline et pas de cache
        return new Response("Offline", { status: 503, statusText: "Offline" });
      });
    })
  );
});

// --- Gestion des Notifications Push ---

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push reçu:', event);

  let data = { 
    title: 'Zen PWA', 
    body: 'Nouvelle notification', 
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
    vibrate: [100, 50, 100],
    data: {
      url: data.url
    },
    tag: 'zen-pwa-notification', // Remplace les notifs précédentes avec le même tag
    renotify: true, // Vibre à nouveau même si une notif avec ce tag est déjà visible
    requireInteraction: true // Sur desktop, empêche la notif de disparaître toute seule
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Clic sur notification');
  event.notification.close();
  
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Si l'app est déjà ouverte, on focus la fenêtre
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url && client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Sinon, on ouvre une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});