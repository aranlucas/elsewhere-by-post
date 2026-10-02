// Bump the cache version when shipped assets change. The app has no remote assets.
const CACHE = 'elsewhere-post-v1';
const ASSETS = ['/', '/index.html', '/maker.html', '/icon.svg', '/manifest.webmanifest', '/src/app.js', '/src/engine.js', '/src/levels.js', '/src/storage.js', '/src/art.js', '/src/style.css', '/src/custom-map.js', '/src/maker.js', '/src/maker.css'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('elsewhere-post-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && ASSETS.includes(new URL(event.request.url).pathname)) {
      const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || (event.request.mode === 'navigate' ? caches.match('/index.html') : Response.error()))));
});
