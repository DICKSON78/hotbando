const CACHE = 'hotbando-v2';
const ASSETS = [
    '/hotspot/',
    '/hotspot/login',
    '/hotspot/signup',
    '/hotspot/dashboard',
    '/hotspot/subscribe',
    '/hotspot/ads',
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    if (e.request.url.includes('/hotspot/') || e.request.url.includes('/assets/')) {
        e.respondWith(
            caches.match(e.request).then((cached) => {
                const fetchPromise = fetch(e.request)
                    .then((res) => {
                        if (res.ok) {
                            const copy = res.clone();
                            caches.open(CACHE).then((cache) => cache.put(e.request, copy));
                        }
                        return res;
                    })
                    .catch(() => cached);
                return cached || fetchPromise;
            })
        );
    }
});

self.addEventListener('push', (e) => {
    const data = e.data?.json() || { title: 'HotBando', body: 'Angalia data yako!' };
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/assets/hot-bando-logo.png',
        badge: '/assets/hot-bando-logo.png',
        vibrate: [200, 100, 200],
        data: { url: data.url || '/hotspot/' },
    });
});

self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const url = e.notification.data?.url || '/hotspot/';
    e.waitUntil(clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
            if (client.url.includes(self.location.host) && 'focus' in client) {
                return client.focus();
            }
        }
        if (clients.openWindow) return clients.openWindow(url);
    }));
});
