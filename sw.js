const CACHE='focusiq-v2';
const ASSETS=[
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './og-image.png'
];

// Install: cache each asset individually so one failure can't abort the whole install
self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache=>
      Promise.all(ASSETS.map(url=>
        cache.add(url).catch(err=>console.warn('[SW] skip',url,err))
      ))
    )
  );
});

// Activate: drop old caches, take control immediately
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

// Fetch: cache-first, fall back to network; navigations fall back to cached shell
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;

  if(req.mode==='navigate'){
    e.respondWith(
      fetch(req)
        .then(res=>{
          const copy=res.clone();
          caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});
          return res;
        })
        .catch(()=>caches.match('./index.html').then(r=>r||caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit=>
      hit || fetch(req).then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
        return res;
      }).catch(()=>hit)
    )
  );
});
