const STATIC_CACHE = 'jclic-static-v5';
const RUNTIME_CACHE = 'jclic-runtime-v5';

const MAIN_IMAGES = [
  './assets/images/192.png',
  './assets/images/altres.png',
  './assets/images/audioclic.png',
  './assets/images/castellano.png',
  './assets/images/ciclo1.png',
  './assets/images/ciclo2.png',
  './assets/images/ciclo3.png',
  './assets/images/compensatoria.png',
  './assets/images/cone.png',
  './assets/images/cono.png',
  './assets/images/diversas.png',
  './assets/images/diverses.png',
  './assets/images/educacionfisica1.png',
  './assets/images/experiencias.png',
  './assets/images/experiencies.png',
  './assets/images/infantil1.png',
  './assets/images/ingles.png',
  './assets/images/lenguaje.png',
  './assets/images/llengua.png',
  './assets/images/matematicas.png',
  './assets/images/matematiques.png',
  './assets/images/musicaclic1.png',
  './assets/images/primaria.png',
  './assets/images/valencia.png',
  './assets/images/varios.png'
];

const APP_SHELL = [
  './',
  './index.html',
  './play.html',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/app.js',
  './data/activities.json',
  './jclic-js/jclic.min.js'
].concat(MAIN_IMAGES);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((cachedPage) => cachedPage || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
        return networkResponse;
      }).catch(() => undefined);
    })
  );
});
