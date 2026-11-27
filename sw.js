const VERSION='fairfare-v18';
const SHELL=['/','/index.html','/offline.html','/css/app.css','/js/app.js','/js/api.js','/js/config.js','/js/matching.js','/js/products.js','/js/images.js','/js/ui.js','/js/guidance.js','/js/contribution.js','/js/policies.js','/js/decks.js','/js/travel-advice.js','/js/receipts.js','/js/references.js','/js/quote.js','/assets/brand-mark.png','/assets/icon-192.png','/assets/icon-512.png','/assets/icon-maskable.png','/assets/favicon-32.png','/assets/monuments/hawa.webp','/assets/monuments/city-palace.webp','/assets/monuments/jaigarh.webp','/assets/monuments/jawahar-kala.webp','/assets/brand/fairfare.webp','/assets/brand/price-check.webp','/assets/brand/ride-ready.webp','/assets/brand/entry.webp','/assets/brand/pass-it-on.webp','/assets/monuments/jantar.webp','/assets/monuments/amber.webp','/manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  // No cross-origin, API, POST, photograph, blob or submission caching.
  if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(r=>r.ok?r:caches.match('/index.html')).catch(()=>caches.match('/index.html').then(r=>r||caches.match('/offline.html'))));return;
  }
  if(!SHELL.includes(u.pathname)||u.search)return;
  e.respondWith(fetch(e.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(VERSION).then(c=>c.put(u.pathname,copy));}return response;}).catch(()=>caches.match(u.pathname)));
});
