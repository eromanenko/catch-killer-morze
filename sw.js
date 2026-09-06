const CACHE_NAME = 'catch-killer-v0.8.2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',

  // CSS
  './css/bootstrap.min.css',
  './css/style.css',
  './css/phone.css',

  // JS
  './js/jquery-4.0.0.slim.min.js',
  './js/html5-qrcode.min.js',
  './js/phone.js',
  './js/qr-scanner.js',
  './js/qr-scanner.js?v=2',

  // Assets
  './assets/icon-128.png',
  './assets/birka.webp',
  './assets/list.webp',
  './assets/papka.webp',

  // Audio
  './audio/5506203050.mp3',
  './audio/5508144909.mp3',
  './audio/5508756314.mp3',
  './audio/5508808080.mp3',
  './audio/5508947279.mp3',
  './audio/75095.mp3',
  './audio/75148.mp3',
  './audio/casper_klaus.mp3',
  './audio/final.mp3',
  './audio/frost.mp3',
  './audio/grim.mp3',
  './audio/morgan-morze.mp3',
  './audio/nevern.mp3',
  './audio/nevern_dop.mp3',
  './audio/start.mp3',
  './audio/tompson.mp3',
  './audio/valdemar.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
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
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    }).catch(() => {
      // Fallback for failed network requests when offline (optional)
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
