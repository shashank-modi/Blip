// Build replaces these constants with a content-versioned asset list.
const CACHE_NAME = 'blip-shell-dev';
const SHELL_ASSETS = ['/offline.html', '/logo-192.png'];
self.addEventListener('install', event => event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL_ASSETS);
    await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('blip-shell-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    // Never cache authentication, private API data, or mutations.
    if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
    if (request.mode === 'navigate') {
        event.respondWith((async () => {
            let timer;
            const controller = new AbortController();
            try {
                timer = setTimeout(() => controller.abort(), 5000);
                const response = await fetch(request, { signal: controller.signal });
                if (response.status >= 500) throw new Error('Server unavailable');
                return response;
            } catch {
                return (await caches.open(CACHE_NAME)).match('/offline.html');
            } finally { clearTimeout(timer); }
        })());
    } else if (SHELL_ASSETS.includes(url.pathname) && !url.search) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            return (await cache.match(request)) || fetch(request);
        })());
    }
});
self.addEventListener('push', event => {
    let data = {};
    try { data = event.data?.json() || {}; } catch { /* Show a safe fallback for an invalid payload. */ }
    event.waitUntil(self.registration.showNotification(data.title || 'blip. · New activity', {
        body: data.body || 'There’s an update to your shared expenses.',
        icon: '/logo-192.png', badge: '/logo-192.png',
        tag: data.id || 'blip-activity',
        data: { url: '/?tab=activity' },
    }));
});
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil((async () => {
        const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const tab = tabs.find(client => new URL(client.url).origin === self.location.origin);
        if (tab) { tab.postMessage({ type: 'OPEN_ACTIVITY' }); return tab.focus(); }
        return self.clients.openWindow('/?tab=activity');
    })());
});
