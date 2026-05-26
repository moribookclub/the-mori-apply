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

messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png'
  });
});
