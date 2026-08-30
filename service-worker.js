/* Service Worker for Bayhaqy Apps
   Strategy: cache-first for static assets (CSS/JS/icons/lib), network-first for HTML.
   This keeps the app snappy on repeat visits while ensuring users always see the
   latest tool versions when online.
*/
var CACHE_VERSION = 'apps-v5-2026-08-31';
var APP_SHELL = [
  '/apps/',
  '/apps/index.html',
  '/apps/manifest.json',
  '/apps/assets/theme.css',
  '/apps/assets/app-shell.js',
  '/apps/icons/icon-192.png',
  '/apps/icons/icon-512.png',
  '/apps/icons/logo.png',
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
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf(APP_ROUTE_PREFIX) !== 0 && url.pathname !== '/apps') return;

  // Cache-first for static assets, network-first for HTML pages.
  var isStaticAsset = /\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|json|wasm|apk)$/.test(url.pathname) ||
                      url.pathname.indexOf('/lib/') !== -1 ||
                      url.pathname.indexOf('/icons/') !== -1 ||
                      url.pathname.indexOf('/assets/') !== -1;

  if (isStaticAsset){
    event.respondWith(
      caches.match(req).then(function(cached){
        if (cached){
          // Refresh in background.
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
    // Network-first for HTML.
    event.respondWith(
      fetch(req).then(function(resp){
        if (!resp || resp.status !== 200) return resp;
        var clone = resp.clone();
        caches.open(CACHE_VERSION).then(function(c){ c.put(req, clone); });
        return resp;
      }).catch(function(){
        return caches.match(req).then(function(cached){
          if (cached) return cached;
          if (req.mode === 'navigate') return caches.match('/apps/index.html');
          return new Response('Offline', { status: 504 });
        });
      })
    );
  }
});
