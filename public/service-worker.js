const CACHE_NAME = 'zen-pwa-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/public/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // On essaye de mettre en cache les assets critiques
      // Si un asset échoue, l'installation ne plante pas complètement
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
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. Ignorer les requêtes non-HTTP (chrome-extension, etc.)
  if (!request.url.startsWith('http')) {
    return;
  }

  // 2. Stratégie Stale-While-Revalidate pour permettre le cache des CDN (Tailwind, React)
  // On ne filtre PLUS sur self.location.origin pour permettre aux CDN de fonctionner offline
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Si on a une version en cache, on la retourne
      if (cachedResponse) {
        // En parallèle, on met à jour le cache pour la prochaine fois (Stale-while-revalidate)
        fetch(request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
            }
        }).catch(() => { /* Pas de réseau, pas grave */ });
        
        return cachedResponse;
      }

      // Sinon on va sur le réseau
      return fetch(request).then((networkResponse) => {
        // On ne met en cache que les succès
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback offline optionnel (pourrait retourner index.html si c'est une navigation)
        // return caches.match('/index.html');
      });
    })
  );
});