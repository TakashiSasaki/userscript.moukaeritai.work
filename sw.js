// This service worker is intentionally kept simple to make the web app installable
// without implementing complex caching strategies.

self.addEventListener('install', () => {
  // Skip waiting to immediately activate the new service worker.
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  // Immediately take control of the page.
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // For installability, a fetch handler is required.
  // This handler does not cache anything, it just returns the network request.
  event.respondWith(fetch(event.request));
});
