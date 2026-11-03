// Giyo offline support: app files from cache, refreshed in the background.
const VERSION = "sb-0.25";
const SHELL = ["./", "index.html", "shim.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "fonts/fonts.css", "fonts/fraunces-normal-latin.woff2", "fonts/fraunces-normal-latin-ext.woff2", "fonts/fraunces-italic-latin.woff2", "fonts/fraunces-italic-latin-ext.woff2", "fonts/geist-normal-latin.woff2", "fonts/geist-normal-latin-ext.woff2"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: url.origin === location.origin });
    const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
