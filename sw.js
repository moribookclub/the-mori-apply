self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAB9FDVMi7AqnKZeTwbq7QYnHY8JZ2mtOk",
  authDomain: "the-mori-apply.firebaseapp.com",
  projectId: "the-mori-apply",
  storageBucket: "the-mori-apply.firebasestorage.app",
  messagingSenderId: "306904700616",
  appId: "1:306904700616:web:2217470905df10786837fd"
});

const messaging = firebase.messaging();

const CACHE = 'mori-apply-v13';
const ASSETS = [
  '/the-mori-apply/',
  '/the-mori-apply/index.html',
  '/the-mori-apply/manifest.json',
  '/the-mori-apply/icon-192.png',
  '/the-mori-apply/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 메시지 받으면 즉시 활성화
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // GET 요청만 처리
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // chrome-extension, 외부 API 등 캐시 불가 요청 제외
  if (url.protocol === 'chrome-extension:' || url.protocol === 'chrome:') return;
  const isExternal =
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('accounts.google.com');

  if (isExternal) {
    e.respondWith(fetch(e.request));
    return;
  }

  // 자체 리소스 — 캐시 우선, 없으면 네트워크 후 캐시 저장
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request)
        .then(res => {
          if (!res || res.status !== 200) return res;
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => {
          // 오프라인 상태에서 페이지 요청이면 index.html 반환
          if (e.request.destination === 'document') {
            return caches.match('/the-mori-apply/index.html');
          }
        });
    })
  );
});
