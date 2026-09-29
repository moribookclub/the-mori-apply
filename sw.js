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
const CACHE = 'mori-apply-v123';
const ASSETS = [
  '/the-mori-apply/',
  '/the-mori-apply/index.html',
  '/the-mori-apply/admin.html',
  '/the-mori-apply/manifest.json',
  '/the-mori-apply/icon-192.png',
  '/the-mori-apply/icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // cache:'reload' → 브라우저 임시저장본이 아닌 서버의 최신 파일로 저장
      .then(c => c.addAll(ASSETS.map(u => new Request(u, {cache: 'reload'}))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if(e.data && e.data.type === 'GET_VERSION'){
    e.source.postMessage({type:'VERSION', version:CACHE});
  }
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

// 화면(HTML)은 항상 서버에서 최신 버전을 먼저 받아옴 (자동 업데이트)
// 3초 안에 응답이 없거나 오프라인이면 저장본으로 표시
function networkFirst(request){
  const fromNetwork = fetch(request.url, {cache: 'no-store', credentials: 'same-origin'})
    // 주소가 바뀌는 경우(예: 끝에 / 붙이기)는 브라우저 기본 방식으로 처리
    .then(res => res.redirected ? fetch(request) : res)
    .then(res => {
    if (res && res.status === 200) {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(request, clone));
    }
    return res;
  });
  const fromCache = () => caches.match(request, {ignoreSearch: true})
    .then(cached => cached || caches.match('/the-mori-apply/index.html'));
  const timeout = new Promise(resolve => setTimeout(resolve, 3000)).then(fromCache);
  return Promise.race([fromNetwork.catch(fromCache), timeout])
    .then(res => res || fromNetwork);
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
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
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(networkFirst(e.request));
    return;
  }
  // 아이콘·매니페스트 등은 저장본 우선 (빠르게)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(res => {
          if (!res || res.status !== 200) return res;
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        });
    })
  );
});
