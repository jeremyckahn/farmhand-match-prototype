const CACHE_NAME = 'farmhand-match-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/style.css',
  '/src/game.js',
  '/src/components/GameHud.js',
  '/manifest.json',
  '/src/assets/icon-192.png',
  '/src/assets/icon-512.png',
  'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js',
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'
];

// Install event - pre-cache essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Stale-While-Revalidate strategy for CDNs and Cache-First for local assets
self.addEventListener('fetch', event => {
  // Use Stale-While-Revalidate for external requests (CDNs)
  if (event.request.url.startsWith('http') && !event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Offline and no cache fallback handled here if needed
          });

          event.waitUntil(fetchPromise);
          return response || fetchPromise;
        });
      })
    );
  } else {
    // Use Cache-First for local assets
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Cache hit - return response
          if (response) {
            return response;
          }

          // Not in cache - fetch from network
          return fetch(event.request).then(
            networkResponse => {
              // Check if valid response
              if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                return networkResponse;
              }

              // Clone the response to put in cache
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });

              return networkResponse;
            }
          ).catch(() => {
             // Handle offline fallback for local resources if needed
          });
        })
    );
  }
});