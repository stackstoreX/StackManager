const CACHE_NAME = 'stack-manager-v1';
const urlsToCache = ['/', '/index.html', '/style.css', '/script.js'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
});

// Push Notifications
self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data.json(); } catch (e) {
        data = { title: 'تنبيه Stack Manager', body: 'لديك اشتراكات تنتهي قريباً!', tag: 'subscription-alert', url: '/#expiring' };
    }

    const options = {
        body: data.body || 'لديك اشتراكات تنتهي قريباً!',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: data.tag || 'subscription-alert',
        requireInteraction: true,
        dir: 'rtl',
        lang: 'ar',
        vibrate: [200, 100, 200],
        actions: [
            { action: 'open-expiring', title: 'عرض الاشتراكات' },
            { action: 'dismiss', title: 'لاحقاً' }
        ],
        data: { url: data.url || '/#expiring' }
    };

    event.waitUntil(self.registration.showNotification(data.title || '⏰ تنبيه تجديد اشتراك', options));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'dismiss') return;
    
    const targetUrl = event.notification.data?.url || '/#expiring';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.focus();
                        return client.navigate(targetUrl);
                    }
                }
                if (clients.openWindow) return clients.openWindow(targetUrl);
            })
    );
});