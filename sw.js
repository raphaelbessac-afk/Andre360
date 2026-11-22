// Service worker: guarda o app para funcionar offline. Suba VERSION a cada publicação.
const VERSION = 'andre360-v2';
const SHELL = [
  './', 'index.html', 'padrinho.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/utils.js', 'js/rules.js', 'js/store.js', 'js/engine.js', 'js/medals.js',
  'js/strava.js', 'js/fx.js', 'js/cloud.js', 'js/firebase-config.js',
  'js/views/ui.js', 'js/views/today.js', 'js/views/history.js', 'js/views/tenis.js', 'js/views/medals.js',
  'js/views/settings.js', 'js/views/onboard.js', 'js/views/padrinho.js', 'js/views/cloudui.js',
  'icons/icon.svg', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
const cacheFirst = (req) =>
  caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    const copy = r.clone();
    caches.open(VERSION).then((c) => c.put(req, copy));
    return r;
  }));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // SDK do Firebase e fontes: arquivos versionados, cache primeiro.
  if ((url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) || url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com') {
    e.respondWith(cacheFirst(e.request));
    return;
  }
  if (url.origin !== location.origin) return;
  // Rede primeiro (para receber atualizações), cache como reserva offline.
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const copy = r.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
