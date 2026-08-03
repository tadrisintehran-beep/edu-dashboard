const CACHE_NAME = 'edu-dashboard-shell-v1'
const SHELL_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

// فقط asset های ثابت رو کش می‌کنیم — درخواست‌های ناوبری (صفحات) و API/Supabase
// همیشه از شبکه می‌رن تا داده‌ی داشبورد هیچ‌وقت stale نشه
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const isShellAsset = SHELL_ASSETS.some((path) => url.pathname === path)
  if (!isShellAsset) return

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  )
})
