// This worker provides notifications only. The captive portal must always
// load the current network version so it cannot get stuck on cached app code.
const CACHE = 'hotbando-v9';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('hotbando-')).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'HotBando', body: 'Angalia data yako!' };
  try { data = { ...data, ...(event.data?.json() || {}) }; } catch (_) { /* use the default notification */ }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/hotspot/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/hotspot/';
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then((clients) => {
    for (const client of clients) {
      if (client.url.includes(self.location.host) && 'focus' in client) return client.focus();
    }
    return self.clients.openWindow ? self.clients.openWindow(url) : undefined;
  }));
});
