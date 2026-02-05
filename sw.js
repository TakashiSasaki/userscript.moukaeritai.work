const CACHE_NAME = 'moukaeritai-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.css',
  './index.js',
  './manifest.json',
  'https://moukaeritai.work/pictgram/192x192.webp',
  'https://moukaeritai.work/pictgram/512x512.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache critical assets
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // We only handle GET requests for caching
  if (event.request.method !== 'GET') return;

  // Network First, falling back to Cache
  event.respondWith(
    (async () => {
      try {
        // Always try to fetch from the network first
        const networkResponse = await fetch(event.request);

        // If fetch is successful, update the cache
        // We check for status 200 (OK) or 0 (Opaque cross-origin response)
        if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
          const cache = await caches.open(CACHE_NAME);
          // Only cache if the response is a valid type to be stored
          // (Basic, CORS, or Opaque are generally fine for GET assets)
          cache.put(event.request, networkResponse.clone());
        }

        return networkResponse;
      } catch (error) {
        // Network failed (offline), try to serve from cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // If neither network nor cache is available, re-throw the error
        throw error;
      }
    })()
  );
});

