#!/usr/bin/env node
/*
 * build.js — renders data.js into the static HTML that ships.
 *
 * data.js stays the single source of truth for all content. This script
 * writes the 42 work cards and 13 section headings straight into
 * index.html, so the guide is readable without JavaScript; the runtime
 * script is left with nothing but the seen/unseen checklist.
 *
 * Nothing is generated from scratch. Each target file keeps its
 * hand-written shape and the build only replaces the bytes between
 * sentinel comments, so prose, CSS and markup outside those regions are
 * copied through untouched.
 *
 *   node build.js                 write index.html, sw.js, sitemap.xml
 *   node build.js --check         exit 1 if any file is out of date
 *   node build.js --report-links  help wire subpage names to work anchors
 *
 * Run it after every edit to data.js and before every commit.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = __dirname;
const p = (...a) => path.join(ROOT, ...a);
const read = f => fs.readFileSync(p(f), 'utf8');

/* ---------------------------------------------------------------- data */

// data.js is a browser file: it assigns to window.GUIDE. Run it in a vm
// with a stub window rather than regex-stripping the assignment, so it
// keeps working if the file ever grows real JavaScript.
function loadGuide() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(read('data.js'), ctx, { filename: 'data.js' });
  const G = ctx.window.GUIDE;
  if (!G || !G.sections || !G.works) throw new Error('data.js did not define window.GUIDE');
  return G;
}

/* ------------------------------------------------------------ escaping */

// data.js holds plain text, never markup — audited, and the build would
// silently emit broken HTML if that changed, so escape unconditionally.
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = s => esc(s).replace(/"/g, '&quot;');

/* -------------------------------------------------------- jpeg reading */

// Intrinsic size straight out of the file, so <img> can carry width and
// height and the page stops reflowing as photographs load. Walks the
// segment chain rather than scanning for FFC0, which would false-positive
// on any byte pair inside the entropy-coded data.
function jpegSize(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt16BE(0) !== 0xffd8) throw new Error(`${file}: not a JPEG`);
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) throw new Error(`${file}: lost segment alignment at ${i}`);
    while (buf[i + 1] === 0xff) i++; // fill bytes
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2; // standalone, no length field
      continue;
    }
    if (marker === 0xda || marker === 0xd9) break; // start of scan / end of image
    const len = buf.readUInt16BE(i + 2);
    const isSOF = marker >= 0xc0 && marker <= 0xcf &&
                  marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  throw new Error(`${file}: no frame header found`);
}

/* ------------------------------------------------------------ emitters */

// The chip label is the section name up to its first colon or em dash:
// "Medieval Europe: Ivories & Illumination" rides in the nav as
// "Medieval Europe".
const chipLabel = name => name.split(':')[0].split('—')[0].trim();

function renderChips(G) {
  return G.sections
    .map((s, i) => `  <a class="chip" href="#s-${s.id}">${i + 1}. ${esc(chipLabel(s.name))}</a>`)
    .join('\n');
}

function renderWall(w, ind) {
  const body = w.text.split('\n\n').map(t => `${ind}  <p>${esc(t)}</p>`).join('\n');
  return [
    `${ind}<details class="wall">`,
    `${ind}<summary><span class="wallkind">${esc(w.kind)}</span><span class="walltitle">${esc(w.src)}</span></summary>`,
    `${ind}<div class="walltext">`,
    body,
    `${ind}</div>`,
    `${ind}</details>`,
  ].join('\n');
}

function renderWallGroup(items, label, also, ind) {
  return [
    `${ind}<div class="walls${also ? ' also' : ''}">`,
    `${ind}<p class="wallslabel">${label}</p>`,
    ...items.map(w => renderWall(w, ind)),
    `${ind}</div>`,
  ].join('\n');
}

function renderWork(w, ind) {
  const { w: iw, h: ih } = jpegSize(p(w.img));
  // Alt text is composed from the fields already in data.js rather than
  // hand-written, so it stays true to the record as the data changes.
  const alt = `${w.title} — ${w.maker}, ${w.mat}`;
  const meta = `${esc(w.mat)}${w.inv ? ` · Inv. ${esc(w.inv)}` : ''}`;
  // Cards ship unseen; the runtime script applies .seen from localStorage.
  return [
    `${ind}<article class="work" id="w-${w.id}">`,
    `${ind}<img src="${escAttr(w.img)}" width="${iw}" height="${ih}" loading="lazy" decoding="async" alt="${escAttr(alt)}">`,
    `${ind}<div class="workbody">`,
    `${ind}  <div class="workhead"><div>`,
    `${ind}    <h3>${esc(w.title)}</h3>`,
    `${ind}    <p class="maker">${esc(w.maker)}</p>`,
    `${ind}    <p class="meta">${meta} · <a href="${escAttr(w.url)}">museum page</a></p>`,
    `${ind}  </div><button class="seenbtn" aria-label="Mark ${escAttr(w.title)} as seen" aria-pressed="false" data-id="${escAttr(w.id)}">✓</button></div>`,
    `${ind}  <p class="blurb">${esc(w.blurb)}</p>`,
    `${ind}</div>`,
    `${ind}</article>`,
  ].join('\n');
}

function renderSections(G) {
  const bySec = {};
  G.works.forEach(w => (bySec[w.sec] = bySec[w.sec] || []).push(w));
  const wallsBySec = {};
  (G.walls || []).forEach(w => { if (w.sec) (wallsBySec[w.sec] = wallsBySec[w.sec] || []).push(w); });

  return G.sections.map(s => {
    const walls = wallsBySec[s.id] || [];
    const rooms = walls.filter(w => w.kind === 'room text');
    const labels = walls.filter(w => w.kind !== 'room text');
    const out = [
      `  <section class="gallery">`,
      `  <h2 id="s-${s.id}">${esc(s.name)}</h2>`,
      `  <p class="intro">${esc(s.intro)}</p>`,
    ];
    if (rooms.length)
      out.push(renderWallGroup(rooms, 'From the walls — the museum’s own room panels', false, '  '));
    (bySec[s.id] || []).forEach(w => out.push(renderWork(w, '  ')));
    if (labels.length)
      out.push(renderWallGroup(labels, 'Nearby in this room — labels worth finding', true, '  '));
    out.push(`  </section>`);
    return out.join('\n');
  }).join('\n');
}

/* ------------------------------------------------------------ regions */

// A region is replaced only when both of its markers are present exactly
// once. Anything else means the file drifted from what the build expects,
// and guessing would risk eating hand-written prose.
function replaceRegion(src, name, body, open, close) {
  const a = open.replace('NAME', name), b = close.replace('NAME', name);
  const count = t => src.split(t).length - 1;
  if (count(a) !== 1 || count(b) !== 1)
    throw new Error(`marker "${name}": expected exactly one ${a} and one ${b}`);
  const i = src.indexOf(a) + a.length, j = src.indexOf(b);
  if (j < i) throw new Error(`marker "${name}": end marker precedes start marker`);
  return src.slice(0, i) + '\n' + body + '\n' + src.slice(j);
}
const htmlRegion = (src, name, body) =>
  replaceRegion(src, name, body, '<!--BEGIN GENERATED NAME-->', '<!--END GENERATED NAME-->');
const jsRegion = (src, name, body) =>
  replaceRegion(src, name, body, '/* BEGIN GENERATED NAME */', '/* END GENERATED NAME */');

/* -------------------------------------------------------------- lastmod */

// Honest dates without churn: a page is stamped today only while its
// source is actually modified, otherwise it keeps the date git recorded.
// Re-running the build on an unchanged tree never rewrites the sitemap.
const TODAY = new Date().toISOString().slice(0, 10);
function lastmodFor(file) {
  try {
    const dirty = execFileSync('git', ['status', '--porcelain', '--', file], { cwd: ROOT }).toString().trim();
    if (dirty) return TODAY;
    const d = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: ROOT }).toString().trim();
    return d || TODAY;
  } catch {
    return TODAY; // no git available — a fresh date is the safe answer
  }
}

/* --------------------------------------------------------------- build */

const SHELL = [
  './', 'index.html', 'faq/', 'highlights-2-hours/', 'manifest.webmanifest',
  'favicon.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
  'img/museum-plan.jpg',
];

// SHELL entries are request URLs, and three of them are directories the
// server resolves to an index. Cache-busting has to read the file behind
// the URL, so it needs the mapping spelled out.
const SHELL_FILE = {
  './': 'index.html',
  'faq/': 'faq/index.html',
  'highlights-2-hours/': 'highlights-2-hours/index.html',
};

// The cache name has to change whenever any cached byte changes.
// Hashing names alone would let a FAQ edit, a reworded manifest or a
// photograph replaced under its own filename ship to a visitor who then
// keeps the old copy forever, because the service worker sees a cache it
// already has. So hash the contents of every file the cache holds.
// index.html is taken from the bytes this run is about to write, not from
// the stale copy still on disk.
function cacheHash(urls, pending) {
  const h = crypto.createHash('sha256');
  for (const url of urls) {
    const file = SHELL_FILE[url] || url;
    const bytes = file in pending ? Buffer.from(pending[file], 'utf8') : fs.readFileSync(p(file));
    // Length-prefixed and delimited so no combination of renames and
    // edits can produce the same byte stream as a different cache.
    h.update(`${url}\0${bytes.length}\0`).update(bytes);
  }
  // 16 hex characters. A collision here would strand every visitor on a
  // stale cache with no way back, and the name is never read by a human,
  // so there is nothing to trade against the extra width.
  return h.digest('hex').slice(0, 16);
}

const PAGES = [
  ['https://vicktorhugoqs.github.io/gulbenkian-guide/', 'index.html'],
  ['https://vicktorhugoqs.github.io/gulbenkian-guide/highlights-2-hours/', 'highlights-2-hours/index.html'],
  ['https://vicktorhugoqs.github.io/gulbenkian-guide/faq/', 'faq/index.html'],
];

function build() {
  const G = loadGuide();
  const out = {};

  // index.html — chips and the full section list.
  let index = read('index.html');
  index = htmlRegion(index, 'chips', renderChips(G));
  index = htmlRegion(index, 'sections', renderSections(G));
  out['index.html'] = index;

  // sw.js — shell list, image list, and a cache name keyed to the content
  // so a stale cache can never outlive a deploy.
  const images = G.works.map(w => w.img).sort();
  const hash = cacheHash([...SHELL, ...images], { 'index.html': index });
  const list = a => a.map(s => `  ${JSON.stringify(s)},`).join('\n');
  let sw = read('sw.js');
  sw = jsRegion(sw, 'assets', [
    `// CacheStorage is scoped to the origin, not to this path, and`,
    `// github.io hosts every one of this account's projects side by side.`,
    `// The prefix is what keeps activate from evicting a neighbour's cache.`,
    `const PREFIX = 'gulbenkian-guide-';`,
    `const CACHE = PREFIX + '${hash}';`,
    ``,
    `// Cached during install: the guide has to be usable the moment it loads.`,
    `const SHELL = [`,
    list(SHELL),
    `];`,
    ``,
    `// Fetched in the background once the page is up, so a visitor on hotel`,
    `// wi-fi walks into the galleries with all ${images.length} photographs offline.`,
    `const IMAGES = [`,
    list(images),
    `];`,
  ].join('\n'));
  out['sw.js'] = sw;

  // sitemap.xml
  const urls = PAGES.map(([loc, file]) =>
    `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmodFor(file)}</lastmod>\n    <changefreq>monthly</changefreq>\n  </url>`
  ).join('\n');
  out['sitemap.xml'] =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return out;
}

/* ------------------------------------------------------- link reporting */

// Work ids are museum slugs, and plenty of them do not resemble the name a
// reader would recognise: Germain's tureens are "310846", the Ulugh Beg jug
// is "jar". So this only ranks candidates for a human to choose from — it
// never rewrites the prose. What it does enforce is that every anchor
// already written points at a work that exists.
const SUBPAGES = ['highlights-2-hours/index.html', 'faq/index.html'];
const STOP = new Set(['the', 'of', 'a', 'an', 'and', 'in', 'to', 'from', 'with', 'at', 'on', 's']);
const tokens = s => (s.toLowerCase().match(/[a-zà-ÿ0-9]+/g) || []).filter(t => !STOP.has(t));

function reportLinks() {
  const G = loadGuide();
  const ids = new Set(G.works.map(w => w.id));
  let bad = 0;

  for (const f of SUBPAGES) {
    const src = read(f);
    console.log(`\n=== ${f} ===\n`);

    for (const m of src.matchAll(/<(b|i)>([^<]{4,})<\/\1>/g)) {
      const phrase = m[2];
      const linked = src.slice(Math.max(0, m.index - 60), m.index).includes('#w-');
      const want = tokens(phrase);
      if (!want.length) continue;
      const ranked = G.works.map(w => {
        const have = new Set([...tokens(w.title), ...tokens(w.maker), ...tokens(w.id)]);
        return { id: w.id, title: w.title, score: want.filter(t => have.has(t)).length };
      }).filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
      console.log(`${linked ? '[linked] ' : '         '}${phrase}`);
      if (!linked) ranked.forEach(c => console.log(`             ~ ${c.id}  (${c.title})`));
    }

    for (const m of src.matchAll(/#w-([a-z0-9-]+)/g)) {
      if (!ids.has(m[1])) { console.error(`  BROKEN ANCHOR: #w-${m[1]}`); bad++; }
    }
  }

  if (bad) { console.error(`\n${bad} anchor(s) point at works that do not exist.`); process.exit(1); }
  console.log('\nAll existing work anchors resolve.');
}

/* ---------------------------------------------------------------- main */

function main() {
  const arg = process.argv[2];
  if (arg === '--report-links') return reportLinks();

  const out = build();
  const changed = Object.entries(out).filter(([f, body]) => read(f) !== body).map(([f]) => f);

  if (arg === '--check') {
    if (changed.length) {
      console.error(`Out of date — run: node build.js\n  ${changed.join('\n  ')}`);
      process.exit(1);
    }
    console.log('Up to date.');
    return;
  }

  changed.forEach(f => fs.writeFileSync(p(f), out[f]));
  console.log(changed.length ? `Wrote ${changed.join(', ')}` : 'No changes.');
}

main();
