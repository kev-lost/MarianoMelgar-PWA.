// sw.js - Service Worker de Producción
const CACHE_NAME = 'mm-seismic-v9-prod';

const CRITICAL_ASSETS = [
    './',
    './index.html',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/lucide@latest',
    'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js'
];

// Instalación y almacenamiento en caché de activos críticos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CRITICAL_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activación y limpieza de versiones antiguas
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => 
            Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null))
        ).then(() => self.clients.claim())
    );
});

// Estrategia Network-First con Fallback a Caché para funcionamiento Offline
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                if (networkResponse.ok && event.request.method === 'GET') {
                    const cacheCopy = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
                }
                return networkResponse;
            })
            .catch(() => caches.match(event.request))
    );
});

// Recepción de Notificación Push Nativa
self.addEventListener('push', event => {
    let payload = {
        title: '🚨 ALERTA SÍSMICA - MARIANO MELGAR',
        body: 'Sismo detectado. Dirígete de inmediato a un punto seguro.',
        icon: 'https://cdn-icons-png.flaticon.com/512/862/862819.png',
        url: '/'
    };

    if (event.data) {
        try { payload = event.data.json(); } 
        catch (e) { payload.body = event.data.text(); }
    }

    const options = {
        body: payload.body,
        icon: payload.icon,
        badge: payload.icon,
        vibrate: [500, 150, 500, 150, 500, 150, 500],
        tag: 'seismic-alert-critical',
        renotify: true,
        data: { url: payload.url || '/' }
    };

    event.waitUntil(self.registration.showNotification(payload.title, options));
});

// Manejo de clic en la notificación
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (let client of clientList) {
                if (client.url.includes('/') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(event.notification.data.url);
        })
    );
});