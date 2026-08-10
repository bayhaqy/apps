/* Service Worker for Apps by Achmad Bayhaqy
   Strategy: cache-first for app shell (HTML/CSS/JS/icons), network-first for app content.
   All app pages and their lib/ assets are cached on first visit → full offline support.
*/
var CACHE_VERSION = 'apps-v2-20260810';
var APP_SHELL = [
  '/apps/',
  '/apps/index.html',
  '/apps/manifest.json',
  '/apps/icons/icon-192.png',
  '/apps/icons/icon-512.png',
  '/apps/api/',
  '/apps/api/index.html',
  '/apps/api/code-formatter.js',
  '/apps/api/text-diff.js',
  '/apps/api/date-calculator.js',
  '/apps/api/timezone-slider.js',
  '/apps/api/loan-calculator.js',
  '/apps/api/converter.js',
  '/apps/api/qr-studio.js',
  '/apps/get-app/'
];

var APP_ROUTE_PREFIX = '/apps/';

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache){
      return cache.addAll(APP_SHELL).catch(function(){ /* ignore individual failures */ });
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_VERSION; })
             .map(function(n){ return caches.delete(n); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  // Only handle GET requests for same-origin /apps/ paths
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf(APP_ROUTE_PREFIX) !== 0 && url.pathname !== '/apps') return;

  // Cache-first for static assets (lib/, icons/), network-first for HTML pages
  var isStaticAsset = /\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|json|wasm)$/.test(url.pathname) ||
                      url.pathname.indexOf('/lib/') !== -1 ||
                      url.pathname.indexOf('/icons/') !== -1;

  if (isStaticAsset){
    event.respondWith(
      caches.match(req).then(function(cached){
        if (cached){
          // refresh in background
          fetch(req).then(function(resp){
            if (resp && resp.status === 200){
              caches.open(CACHE_VERSION).then(function(c){ c.put(req, resp.clone()); });
            }
          }).catch(function(){});
          return cached;
        }
        return fetch(req).then(function(resp){
          if (!resp || resp.status !== 200) return resp;
          var clone = resp.clone();
          caches.open(CACHE_VERSION).then(function(c){ c.put(req, clone); });
          return resp;
        }).catch(function(){ return new Response('', { status: 504 }); });
      })
    );
  } else {
    // Network-first for HTML, fall back to cache when offline
    event.respondWith(
      fetch(req).then(function(resp){
        if (!resp || resp.status !== 200) return resp;
        var clone = resp.clone();
        caches.open(CACHE_VERSION).then(function(c){ c.put(req, clone); });
        return resp;
      }).catch(function(){
        return caches.match(req).then(function(cached){
          if (cached) return cached;
          // For navigations to /apps/<sub>/ without cache, fall back to landing
          if (req.mode === 'navigate') return caches.match('/apps/index.html');
          return new Response('Offline', { status: 504 });
        });
      })
    );
  }
});
