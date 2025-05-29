importScripts('https://www.gstatic.com/firebasejs/10.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBJhFAuqErsrHkalRcDF6wWVYHrDHHgu4M",
  authDomain: "lhnutri-51910.firebaseapp.com",
  projectId: "lhnutri-51910",
  messagingSenderId: "669244125423",
  appId: "1:669244125423:web:18e1242cf3b25f0d46ab1a"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/icon.png' // opcional
  });
});
