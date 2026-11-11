const CACHE = "shared-calendar-" + self.__CACHE_VERSION__;
const PRECACHE = self.__PRECACHE__;
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/__/")
  )
    return;
  const navigation = event.request.mode === "navigate";
  const asset =
    url.pathname.startsWith("/assets/") ||
    ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"].includes(
      url.pathname,
    );
  if (!navigation && !asset) return;
  const key = navigation ? "/" : event.request;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE).then((cache) => cache.put(key, copy)),
          );
        }
        return response;
      })
      .catch(() =>
        caches
          .match(key, { ignoreVary: true })
          .then((response) => response || Response.error()),
      ),
  );
});
