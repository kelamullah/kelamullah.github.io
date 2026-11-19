/**
 * Kelâmullah - Service Worker
 * Provides offline PWA support, local asset caching, and instant load.
 */

const CACHE_NAME = 'kelamullah-v6';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './assets/logo.jpg',
  './assets/manifest.json',
  './css/main.css?v=6',
  './css/quran-font.css?v=6',
  './fonts/abay_mushaf_tdv_normal.ttf',
  './fonts/quran_font_hamdullah.ttf',
  './js/data-service.js?v=6',
  './js/audio.js?v=6',
  './js/search.js?v=6',
  './js/reader.js?v=6',
  './js/mushaf.js?v=6',
  './js/app.js?v=6',
  './data/quran_data.js',
  './data/kuran_sureler.json'
];

// Install: Cache all core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for HTML, Cache-first / Stale-While-Revalidate for static assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET requests or external streaming audio (everyayah)
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // HTML navigation: Network-first with cache fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static assets: Cache-first with background revalidation
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background
        fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
          }
        }).catch(() => {/* Offline */});

        return cachedResponse;
      }

      return fetch(req).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const toCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, toCache));
        return networkResponse;
      });
    })
  );
});
