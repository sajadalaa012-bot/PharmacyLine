/* velina service worker.
 *
 * Three jobs:
 *
 *   1. Keep the shop usable on a bad connection. Pages are fetched from the
 *      network first and fall back to the last copy seen, or to /offline.html
 *      when there is no copy. Product photos and icons come from the cache
 *      first and refresh in the background, because a photo that has not
 *      changed is not worth a round trip on a phone signal.
 *
 *   2. Never cache the API. Prices, stock and order status have to be live,
 *      and a stale catalogue is worse than a slow one.
 *
 *   3. Show push notifications and open the right page when one is tapped.
 *
 * Bump CACHE whenever this file changes: the old cache is deleted on activate,
 * so a version bump is what clears out stale pages.
 */

const CACHE = "velina-v2";
const OFFLINE_URL = "/offline.html";

/** The least that has to be there for the app to open with no connection. */
const PRECACHE = [
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/velina-logo.png",
  "/icons/velina-logo-dark.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // One missing file must not fail the whole install, so each is added on
      // its own and a failure is shrugged off.
      .then((cache) =>
        Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {})))
      )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

/** The page asking this worker to stop waiting and take over now. */
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

/** Photos and icons: serve what we have, and quietly fetch a fresher copy. */
function staleWhileRevalidate(request) {
  return caches.open(CACHE).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
}

/** Everything else: the network, falling back to the last copy seen. */
function networkFirst(request, fallback) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() =>
      caches
        .match(request)
        .then(
          (cached) =>
            cached ||
            (fallback ? caches.match(fallback) : undefined) ||
            Response.error()
        )
    );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // A page. Falls back to the offline card rather than the browser's error.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, OFFLINE_URL));
    return;
  }

  if (
    url.pathname.startsWith("/products/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

// ── Notifications ───────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "velina", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "velina", {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      // Same tag replaces an earlier notice about the same order rather than
      // stacking a second one up.
      tag: payload.tag,
      renotify: !!payload.tag,
      vibrate: [80, 40, 80],
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        // An app already open is focused and steered, rather than opening a
        // second copy of the shop beside it.
        for (const client of windows) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            return client.focus().then((focused) =>
              "navigate" in focused ? focused.navigate(target) : focused
            );
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
