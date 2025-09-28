const CACHE_NAME = 'valva-cache-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/graph-editor',
  '/add-device-page',
  '/maintenance-page',  
  '/static/styles/style.css',
  '/static/styles/graph_page_style.css',
  '/static/javascript_files/app.js',
  '/static/javascript_files/common.js',
  '/static/javascript_files/add_device.js',
  '/static/javascript_files/index.js',
  '/static/javascript_files/graph_logic.js',
  '/static/javascript_files/maintenance.js',
  '/static/manifest.json',
  '/static/icons/favicon.ico',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => {
      return resp || fetch(event.request).catch(() => new Response("Offline"));
    })
  );
});
