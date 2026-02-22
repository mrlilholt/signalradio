const CACHE_NAME = 'signal-radio-shell-v1'
const PRECACHE_URLS = ['/', '/index.html', '/manifest.webmanifest', '/signal.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(event.request.url)

  if (requestUrl.origin !== self.location.origin) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        return cache.match('/index.html')
      }),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then(async (cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      const networkResponse = await fetch(event.request)
      const cache = await caches.open(CACHE_NAME)
      cache.put(event.request, networkResponse.clone()).catch(() => {})
      return networkResponse
    }),
  )
})
