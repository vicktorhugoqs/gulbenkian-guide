const CACHE = 'gulbenkian-guide-v7';
const ASSETS = [
 "./",
 "index.html",
 "faq/",
 "highlights-2-hours/",
 "data.js",
 "manifest.webmanifest",
 "favicon.png",
 "apple-touch-icon.png",
 "icon-192.png",
 "icon-512.png",
 "img/museum-plan.jpg",
 "img/310846.jpg",
 "img/assyrian-low-relief.jpg",
 "img/boy-blowing-bubbles.jpg",
 "img/bust-of-saint-catherine-bust-of-saint-joseph.jpg",
 "img/coromandel-screen.jpg",
 "img/decadrachm-of-syracuse-coin.jpg",
 "img/deep-plate-with-peacocks.jpg",
 "img/diana-2.jpg",
 "img/dragon-carpet.jpg",
 "img/dragonfly-corsage-ornament.jpg",
 "img/garniture-3.jpg",
 "img/greek-vase.jpg",
 "img/head-of-king-senusret-iii.jpg",
 "img/hours-of-margaret-of-cleves.jpg",
 "img/illuminated-bible.jpg",
 "img/jar.jpg",
 "img/le-tapis-vert-2.jpg",
 "img/low-relief-depicting-princess-maritites.jpg",
 "img/mechanical-table.jpg",
 "img/medal-cabinet-one-of-a-pair.jpg",
 "img/medallion-2.jpg",
 "img/miniature-from-the-anthology-of-sultan-iskandar.jpg",
 "img/mosque-lamp-2.jpg",
 "img/pallas-athena.jpg",
 "img/peacock-pectoral.jpg",
 "img/portrait-of-a-young-woman.jpg",
 "img/portrait-of-an-old-man.jpg",
 "img/portrait-of-duval-de-lepinoy.jpg",
 "img/portrait-of-helena-fourment.jpg",
 "img/portrait-of-madame-claude-monet.jpg",
 "img/portrait-of-mrs-lowndes-stone.jpg",
 "img/prayer-niche.jpg",
 "img/regatta-on-the-grand-canal.jpg",
 "img/rolltop.jpg",
 "img/self-portrait-or-degas-saluant.jpg",
 "img/serpents-pectoral.jpg",
 "img/suzuribako-writing-box.jpg",
 "img/the-break-up-of-the-ice.jpg",
 "img/the-mirror-of-venus.jpg",
 "img/the-wreck-of-a-transport-ship.jpg",
 "img/torso-of-king-pedubast.jpg",
 "img/triptych-with-scenes-of-the-life-and-death-of-the-virgin.jpg"
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then(hit =>
      hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
    )
  );
});
