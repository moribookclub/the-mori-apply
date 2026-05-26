const CACHE = 'mori-apply-v2';
const ASSETS = [
  '/the-mori-apply/',
  '/the-mori-apply/index.html',
  '/the-mori-apply/manifest.json',
  '/the-mori-apply/icon-192.png',
  '/the-mori-apply/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firebase, Google API 등 외부 요청은 캐시 건드리지 않음
  if (url.origin !== location.origin) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // 캐시 우선, 없으면 네트워크 → 캐시 저장
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => {
        // 오프라인 fallback
        if (e.request.destination === 'document') {
          return caches.match('/the-mori-apply/index.html');
        }
      });
    })
  );
});
