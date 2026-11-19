const CACHE='r3-research-shell-v1';
const STATIC=['/','/index.html','/favicon.svg','/manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
 const req=e.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 // Cache-first app static assets; HTML network-first keeps deployments fresh.
 if(req.mode==='navigate'){
  e.respondWith(fetch(req).then(response=>{const copy=response.clone();caches.open(CACHE).then(c=>c.put('/index.html',copy));return response;}).catch(()=>caches.match('/index.html')));
  return;
 }
 e.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return response;})));
});
