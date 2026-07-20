/* Asset lists and the cache name are generated — run: node build.js */
/* BEGIN GENERATED assets */
// CacheStorage is scoped to the origin, not to this path, and
// github.io hosts every one of this account's projects side by side.
// The prefix is what keeps activate from evicting a neighbour's cache.
const PREFIX = 'gulbenkian-guide-';
const CACHE = PREFIX + 'cc487aae66df2275';

// Cached during install: the guide has to be usable the moment it loads.
const SHELL = [
  "./",
  "index.html",
  "faq/",
  "highlights-2-hours/",
  "manifest.webmanifest",
  "favicon.png",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "img/museum-plan.jpg",
];

// Fetched in the background once the page is up, so a visitor on hotel
// wi-fi walks into the galleries with all 42 photographs offline.
const IMAGES = [
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
  "img/triptych-with-scenes-of-the-life-and-death-of-the-virgin.jpg",
];
/* END GENERATED assets */

// Install caches the shell only. The old build precached all 42
// photographs here with addAll, which is all-or-nothing — a single 404
// threw the whole install away — and it held up first use to download
// ~1.7 MB nobody had asked for yet. allSettled means one missing file
// costs that file alone.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

// Drop superseded caches, but only ones this guide made: the unfiltered
// sweep this replaced deleted every cache on the origin, and on
// github.io that is every other project the account publishes.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

// Cache-first, and every fetched response is kept. This is also the lazy
// tier for images: anything the visitor scrolls past is stored even if the
// background download below never runs.
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

// The page asks for this once it is idle, so the visitor reaches the
// galleries with every photograph stored. Capped concurrency: the point is
// to fill the cache without making the tab feel slow.
async function cacheImages() {
  const cache = await caches.open(CACHE);
  const queue = IMAGES.slice();
  let done = 0, failed = 0;

  const post = async () => {
    const cs = await self.clients.matchAll();
    cs.forEach(c => c.postMessage({type: 'cache-progress', done, total: IMAGES.length, failed}));
  };

  const worker = async () => {
    for (let url; (url = queue.shift());) {
      // Already stored — count it and move on, so a second run is cheap.
      if (!(await cache.match(url, {ignoreSearch: true}))) {
        try { await cache.add(url); } catch (err) { failed++; }
      }
      done++;
      if (done % 6 === 0) await post();
    }
  };

  await Promise.all(Array.from({length: 6}, worker));
  await post();
}

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'cache-images') e.waitUntil(cacheImages());
});
