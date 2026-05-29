// Service Worker — NäköHarjoitus (Silmäasema)
// Network-first strategia: aina yritetään verkkoa ensin, cache fallbackina offlinessä.
// Bumppaa CACHE_NAME aina kun julkaiset uudet HTML/CSS/JS/materiaali-tiedostot,
// jotta vanha cache puretaan automaattisesti.

const CACHE_NAME = 'nakoharjoitus-v3';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './nakoharjoitukset.html',
  './qrcode.min.js',
  './lz-string.min.js',
  './silmaasema-logo.jpg',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon-maskable.svg',
  './materiaalit/brock-lanka-ohje.pdf',
  './materiaalit/sakkadi-numerotaulu.html'
];

// Install: pre-cache kaikki kriittiset resurssit
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll fail-fast: jos jokin resurssi 404 → install epäonnistuu kokonaan.
      // Käytämme yksittäisiä add()-kutsuja joiden virheet sallitaan, jotta puuttuvat
      // valinnaiset tiedostot (esim. materiaalit) eivät kaada koko asennusta.
      return Promise.all(
        PRECACHE_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] Precache skip:', url, err.message);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: siivoa vanhat cachet
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first kaikkialla, cache fallbackina
self.addEventListener('fetch', event => {
  const req = event.request;

  // Vain GET-pyynnöt cachetään
  if (req.method !== 'GET') return;

  // Ohitetaan cross-origin (Google Fonts, api-kutsut jne.) — selain hoitaa nuo itse
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        // Päivitä cache vain onnistuneilla vasteilla
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match('./nakoharjoitukset.html')))
  );
});
