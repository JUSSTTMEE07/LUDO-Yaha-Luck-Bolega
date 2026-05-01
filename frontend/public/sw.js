const clearEverything = () =>
  caches.keys()
    .then(keys => Promise.all(keys.map(key => caches.delete(key))))
    .catch(() => Promise.resolve())

self.addEventListener('install', event => {
  event.waitUntil(clearEverything().then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    clearEverything()
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => Promise.all(clients.map(client => client.navigate(client.url))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', () => {
  // Intentionally empty. The app must always use the live Vite/build files.
})
