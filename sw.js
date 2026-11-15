/* sw.js — lets the app open without internet once it has been opened online.
   It always tries the internet first (so you get the newest version),
   and uses the saved copy when there is no internet. */
const CACHE = 'techpack-v2';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/core.js', './js/db.js', './js/model.js', './js/settings.js', './js/images.js',
  './js/home.js', './js/editor.js', './js/sheets.js', './js/export.js', './js/costing.js', './js/app.js',
  './vendor/html2canvas.min.js', './vendor/jspdf.umd.min.js', './vendor/xlsx.full.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // only our own files
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
