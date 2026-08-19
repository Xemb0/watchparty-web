// firebase-messaging-sw.js
// ───────────────────────────────────────────────────────────────────────────
// SINGLE service worker for scope / (site root). The filename "firebase-messaging-sw.js"
// is load-bearing (FCM getToken auto-resolution) and must NOT change. It does
// two things:
//   1. Firebase Cloud Messaging background notifications (unchanged behaviour).
//   2. Satisfies PWA installability with a ZERO-CACHE, no-op fetch handler.
//
// ⚠️  NEVER add caching here (Cache Storage, precache, cache-first,
//     stale-while-revalidate, or event.respondWith with a cached response).
//     index.html and *.js are NOT content-hashed, so any caching layer risks
//     pinning users to an unrecoverable stale/broken build. Offline is a
//     non-goal (this is a realtime app). The fetch handler exists only so
//     Chrome treats the app as installable.
// ───────────────────────────────────────────────────────────────────────────

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDxHtbfVY0Tudx9TkSRPT5J-xBtphCTtsc",
    authDomain: "watchparty-1316f.firebaseapp.com",
    projectId: "watchparty-1316f",
    messagingSenderId: "423168474803",
    appId: "1:423168474803:web:6ef32757f371aa65e57ac6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'WatchParty';
    // Resolve against the SW scope so it works at the site root. (Was '/favicon.ico',
    // which 404s — there is no favicon at that path.)
    const icon = new URL('icons/icon-192.png', self.registration.scope).href;
    self.registration.showNotification(title, {
        body: payload.notification?.body || 'You have a new notification',
        icon: icon,
        badge: icon
    });
});

// PWA installability only: a fetch handler that NEVER intercepts. No respondWith,
// no Cache API — byte-for-byte identical to having no SW for content delivery,
// so it can never serve a stale build. Do not add logic here.
self.addEventListener('fetch', function () { /* no-op — installability only */ });
