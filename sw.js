// Service worker for plugins.yleoft.me.
// Only handles the site itself; Javadocs and every other path go straight to the network.
//   - the page and project data: network first, cached copy when offline
//   - styles and scripts: cache first (their URLs carry ?v=, so a new version is a new URL)
//   - images and fonts: served from cache, refreshed in the background
const CACHE = 'zp-v5';
const SHELL = ['./', 'styles/site.css?v=5', 'scripts/app.js?v=5', 'fonts/rubik-latin.woff2', 'sources/global/yleoft.png'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

const scope = new URL(self.registration.scope);

function isSitePage(url) {
    const path = url.pathname.slice(scope.pathname.length);
    return path === '' || path === 'index.html';
}

async function networkFirst(request) {
    const cache = await caches.open(CACHE);
    try {
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone()).catch(() => {});
        return res;
    } catch (err) {
        const hit = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
        if (hit) return hit;
        throw err;
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(request);
    if (hit) return hit;
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone()).catch(() => {});
    return res;
}

async function staleWhileRevalidate(request, event) {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(request);
    const refresh = fetch(request).then(res => {
        if (res.ok) cache.put(request, res.clone()).catch(() => {});
        return res;
    });
    if (hit) {
        event.waitUntil(refresh.catch(() => {}));
        return hit;
    }
    return refresh;
}

// Any cache failure (quota, private mode, storage errors) falls back to a plain network request,
// so the service worker can never make the site worse than having no service worker at all.
function respond(event, strategy) {
    const { request } = event;
    event.respondWith(strategy(request, event).catch(() => fetch(request)));
}

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
    if (url.pathname.includes('/javadocs/')) return;

    if (request.mode === 'navigate') {
        if (isSitePage(url)) respond(event, networkFirst);
        return;
    }
    if (url.pathname.endsWith('.json')) {
        respond(event, networkFirst);
    } else if (/\.(css|js)$/.test(url.pathname) && url.search) {
        respond(event, cacheFirst);
    } else if (/\.(png|webp|svg|woff2|ico)$/.test(url.pathname)) {
        respond(event, staleWhileRevalidate);
    }
});
