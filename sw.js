// ============================================================
//  MeeChain Service Worker — PWA Offline Support v2.0
//  Cache Strategy: Network-first for API, Cache-first for assets
// ============================================================
const CACHE_NAME   = 'meechain-v2.0';
const STATIC_CACHE = 'meechain-static-v2.0';
const API_CACHE    = 'meechain-api-v2.0';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/nft-market.html',
  '/explorer.html',
  '/dao.html',
  '/src/css/main.css',
  '/src/css/animations.css',
  '/src/css/chat.css',
  '/src/js/app.js',
  '/src/js/chart.js',
  '/src/js/chat-widget.js',
  '/src/js/data.js',
  '/src/js/staking.js',
  '/src/js/wallet.js',
  '/src/js/websocket.js',
  '/src/assets/images/meechain_logo.png',
  '/src/assets/images/meebot.png',
  '/manifest.json',
];

// ── Install: pre-cache static assets ─────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })))
        .catch(err => console.warn('[SW] Pre-cache failed (some assets may not exist yet):', err));
    })
  );
});

// ── Activate: clean old caches ────────────────────────────
self.addEventListener('activate', (event) => {
  const CURRENT_CACHES = [STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => !CURRENT_CACHES.includes(k)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategy ───────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, WebSocket, Chrome extension requests
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.pathname.startsWith('/ws')) return;

  // API endpoints — Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE, 5000));
    return;
  }

  // Static assets & pages — Cache first, fallback to network
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

// ── Cache-first strategy ──────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return offline page fallback
    const fallback = await caches.match('/index.html');
    return fallback || new Response('Offline — กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// ── Network-first strategy ────────────────────────────────
async function networkFirst(request, cacheName, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    clearTimeout(timer);
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', message: 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ── Background sync: queue failed API calls ───────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-votes') {
    event.waitUntil(syncPendingVotes());
  }
});

async function syncPendingVotes() {
  // In production: read from IndexedDB and retry failed DAO votes
  console.log('[SW] Background sync: checking pending votes...');
}

// ── Push notifications ────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title   = data.title   || '🔔 MeeChain';
  const options = {
    body:    data.body   || 'มีการอัปเดตใหม่บน MeeChain',
    icon:    data.icon   || '/src/assets/images/meechain_logo.png',
    badge:   data.badge  || '/src/assets/images/meechain_logo.png',
    tag:     data.tag    || 'meechain-notification',
    data:    data.url    || '/',
    actions: data.actions || [
      { action: 'open', title: '📱 เปิดดู' },
      { action: 'close', title: '✖ ปิด' },
    ],
    requireInteraction: data.requireInteraction || false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;
  const targetUrl = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const existingWindow = windowClients.find(c => c.url === targetUrl && 'focus' in c);
      if (existingWindow) return existingWindow.focus();
      return clients.openWindow(targetUrl);
    })
  );
});

console.log('[SW] MeeChain Service Worker v2.0 loaded');
