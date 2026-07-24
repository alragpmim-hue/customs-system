const CACHE_NAME = 'customs-v2.1-report';
const urlsToCache = [
  './',
  './index.html',
  './js/db.js',
  './js/auth.js',
  './js/utils.js',
  './js/data-init.js',
  './js/app.js',
  './data/employees.json',
  './manifest.json'
];

// External CDN resources (optional, may fail but app still works)
const cdnUrls = [
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache core files first (must succeed)
        return cache.addAll(urlsToCache)
          .then(() => {
            // Try to cache CDN files (may fail, that's ok)
            return Promise.allSettled(
              cdnUrls.map(url => cache.add(url).catch(() => console.log('CDN cache skip:', url)))
            );
          });
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) return response;

        // Otherwise fetch from network
        return fetch(event.request)
          .then(networkResponse => {
            // Cache successful network responses for offline use
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Offline fallback for navigation
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
