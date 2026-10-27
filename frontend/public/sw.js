const CACHE = 'hotbando-v6';

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(['/hotspot/', '/logo.png'])).catch(() => {})
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
    const url = new URL(e.request.url);
    if (url.origin !== self.location.origin) return;

    // App shell (navigations) — network-first so new releases show immediately.
    if (url.pathname.startsWith('/hotspot/')) {
        e.respondWith(
            fetch(e.request)
                .then((res) => {
                    if (res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE).then((cache) => cache.put(e.request, copy));
                    }
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
        return;
    }

    // Hashed build assets are immutable — cache-first with background refresh.
    if (url.pathname.startsWith('/assets/')) {
        e.respondWith(
            caches.match(e.request).then((cached) =>
                cached ||
                fetch(e.request).then((res) => {
                    if (res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE).then((cache) => cache.put(e.request, copy));
                    }
                    return res;
                })
            )
        );
    }
});

self.addEventListener('push', (e) => {
    const data = e.data?.json() || { title: 'HotBando', body: 'Angalia data yako!' };
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/logo.png',
        badge: '/logo.png',
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
