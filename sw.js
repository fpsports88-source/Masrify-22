/* Service Worker — مصاريفي (YS)
   - صفحات التطبيق: الشبكة أولًا (تحديثات فورية) ثم الكاش عند انقطاع الإنترنت
   - مكتبات Firebase والخطوط: الكاش أولًا
   - طلبات Firebase/Google API: لا نتدخل فيها أبدًا */
const CACHE_VERSION = 'v2.6.0';
const CACHE_NAME = `masarify-cache-${CACHE_VERSION}`;
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
];
const CDN_HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // كل ملف على حدة: فشل ملف واحد لا يُفشل التثبيت كله
      .then(cache => Promise.all(PRECACHE.map(u => cache.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!url.protocol.startsWith('http')) return;

  // مكتبات Firebase والخطوط: الكاش أولًا
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  // أي نطاق آخر (Firestore / Auth / صفحات تسجيل الدخول): لا نتدخل
  if (url.origin !== self.location.origin) return;

  // ملفات التطبيق: الشبكة أولًا ثم الكاش
  event.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); }
      return res;
    }).catch(() =>
      caches.match(req).then(cached => cached || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
    )
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
