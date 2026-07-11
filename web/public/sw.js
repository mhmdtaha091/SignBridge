/// <reference lib="webworker" />

const CACHE = 'signbridge-v1'

const APP_SHELL = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/og-image.png',
  '/og-image.svg',
]

const PRELOAD_MODELS = [
  '/models/hand_landmarker.task',
  '/models/pose_landmarker_lite.task',
  '/models/asl-default/',
  '/models/gru-word-signs/',
  '/models/psl-default/',
  '/models/psl-gru-word-signs/',
]

const PRELOAD_WASM = [
  '/wasm/vision_wasm_internal.js',
  '/wasm/vision_wasm_internal.wasm',
  '/wasm/vision_wasm_module_internal.js',
  '/wasm/vision_wasm_module_internal.wasm',
  '/wasm/vision_wasm_nosimd_internal.js',
  '/wasm/vision_wasm_nosimd_internal.wasm',
]

const PRELOAD_REFERENCES = [
  '/references/hello.json',
  '/references/love.json',
  '/references/no.json',
  '/references/thank you.json',
  '/references/yes.json',
]

const PRELOAD_SEED = [
  '/seed/asl-fingerspelling.json',
  '/seed/psl-fingerspelling.json',
]

// ── Install: pre-cache app shell + critical assets ────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      const all = [
        ...APP_SHELL,
        ...PRELOAD_WASM,
        ...PRELOAD_MODELS,
        ...PRELOAD_REFERENCES,
        ...PRELOAD_SEED,
      ]
      // Cache each URL individually so one failure doesn't kill the rest.
      await Promise.allSettled(all.map((url) => cache.add(url)))
      // Force the waiting SW to activate immediately.
      self.skipWaiting()
    })(),
  )
})

// ── Activate: claim clients so the SW controls pages immediately ──────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Purge old cache versions.
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      self.clients.claim()
    })(),
  )
})

// ── Fetch: cache-first for static assets, network-first for navigation ────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests.
  if (url.origin !== self.location.origin || request.method !== 'GET') return

  // For navigation requests (HTML), try network first, fall back to cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(request)
          const cache = await caches.open(CACHE)
          cache.put(request, net.clone())
          return net
        } catch {
          const cached = await caches.match(request)
          if (cached) return cached
          // Offline fallback: serve index.html for any nav request.
          return caches.match('/index.html')
        }
      })(),
    )
    return
  }

  // For everything else (JS, CSS, WASM, models, references, etc.), cache-first
  // with network fallback (stale-while-revalidate style).
  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) {
        // Refresh cache in background.
        fetch(request)
          .then((net) => {
            if (net.ok) caches.open(CACHE).then((c) => c.put(request, net))
          })
          .catch(() => {})
        return cached
      }
      try {
        const net = await fetch(request)
        const cache = await caches.open(CACHE)
        cache.put(request, net.clone())
        return net
      } catch {
        // If it's a model/WASM/reference, try the cache one more time.
        return caches.match(request)
      }
    })(),
  )
})
