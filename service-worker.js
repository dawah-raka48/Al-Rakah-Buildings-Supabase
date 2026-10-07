const CACHE="rakah-realestate-v3";
const ASSETS=[
  "./",
  "./index.html",
  "./buildings.html",
  "./entry.html",
  "./reports.html",
  "./settings.html",
  "./login.html",
  "./css/style.css",
  "./css/print.css",
  "./js/config.js",
  "./js/auth.js",
  "./js/app.js",
  "./js/initial-seed.js",
  "./js/dashboard.js",
  "./js/buildings.js",
  "./js/entry.js",
  "./js/reports.js",
  "./js/settings.js",
  "./icons/icon.svg",
  "./manifest.webmanifest",
  "./data/initial-data.json.gz.b64"
];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  if(event.request.method!=="GET")return;
  if(url.pathname.includes("/exec"))return;
  event.respondWith(
    fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }).catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html")))
  );
});