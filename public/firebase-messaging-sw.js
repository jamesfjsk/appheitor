// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configuração do Firebase (será preenchida automaticamente)
const firebaseConfig = {
  apiKey: "AIzaSyDxWOm5irJVoI4ZdKX80wO4lwLgVAwPI4k",
  authDomain: "app-heitor.firebaseapp.com",
  projectId: "app-heitor",
  storageBucket: "app-heitor.firebasestorage.app",
  messagingSenderId: "662366085752",
  appId: "1:662366085752:web:cdac67d00e90fea892038d"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('📨 Background Message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'Flash Missions';
  const notificationOptions = {
    body: payload.notification?.body || 'Nova notificação!',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: 'flash-missions',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Abrir App'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    // Open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // If app is already open, focus it
          for (const client of clientList) {
            if (client.url.includes('localhost') || client.url.includes('flash-missions')) {
              return client.focus();
            }
          }
          // Otherwise open new window
          return clients.openWindow('/');
        })
    );
  }
});