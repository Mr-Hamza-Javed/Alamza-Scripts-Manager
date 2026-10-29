/* Alamza Scripts service worker.
   Makes the app installable and lets it open without a connection.
   - Pages: network first, so a new version shows as soon as it is online; the last copy
     is used offline.
   - Built files (/assets/…, hashed names that never change): cache first.
   - Icons and the manifest: cache, refreshed in the background.
   Firebase, Google sign-in and fonts are never touched: they go straight to the network. */
const CACHE = 'alamza-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png'];
const MAX_ASSETS = 80;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* keep the cache from growing forever as new versions are deployed */
async function trim(cache) {
  const keys = (await cache.keys()).filter((r) => new URL(r.url).pathname.includes('/assets/'));
  for (let i = 0; i < keys.length - MAX_ASSETS; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  /* Firebase Hosting's own helper files */
  if (url.pathname.startsWith('/__/')) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(req);
        if (fresh.ok) cache.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const fresh = await fetch(req);
      if (fresh.ok) { await cache.put(req, fresh.clone()); trim(cache); }
      return fresh;
    })());
    return;
  }

  /* icons, manifest and other small files: answer from the cache, refresh behind it */
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const update = fetch(req).then((fresh) => { if (fresh.ok) cache.put(req, fresh.clone()); return fresh; }).catch(() => hit);
    return hit || update;
  })());
});
