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
    const options = {
        body: payload.notification?.body || 'You have a new notification',
        icon: '/favicon.ico'
    };
    self.registration.showNotification(title, options);
});
