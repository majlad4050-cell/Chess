const CACHE_NAME = "sweet-chess-golden-v2";

const FILES_TO_CACHE = [
  "index.html",
  "style.css",
  "script.js",
  "manifest.json",
  "assets/images/header.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/audio/music1.mp3",
  "assets/audio/music2.mp3",
  "assets/audio/music3.mp3",
  "assets/audio/music4.mp3",
  "assets/audio/music5.mp3",
  "assets/audio/music6.mp3",
  "assets/audio/music7.mp3",
  "assets/audio/music8.mp3",
  "assets/audio/music9.mp3",
  "assets/audio/music10.mp3",
  "assets/audio/music11.mp3",
  "assets/audio/music12.mp3",
  "lib/chess.js",
  "lib/stockfish.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      cache.addAll(FILES_TO_CACHE).catch(err => {
        console.log("Some files could not be cached:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      });
    }).catch(err => {
      console.log("Fetch failed:", err);
    })
  );
});
