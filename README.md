# Gulbenkian Museum — Founder's Collection Field Guide

A static, offline-capable visit guide for the [Calouste Gulbenkian Museum](https://gulbenkian.pt/museu/en/) (Lisbon), built for the collection's reopening day, 18 July 2026, after its 16-month renovation.

**Live:** hosted on GitHub Pages from this repo's root.

## What it is

- 42 highlight works in circuit order, grouped into 13 sections (Egypt → Lalique → the new numismatics room), each with a short context essay and section intro.
- "From the walls": the museum's own room, case and object-label texts (English side), transcribed from photographs taken on the reopening-night visit. These are embedded within the 13 sections — room panels above the works, object labels below — not held in a separate section.
- Tap the ✓ on a card to mark it seen — progress persists in `localStorage`.
- "Next unseen" button jumps down the route.
- Every work is in the served HTML, so the guide reads with JavaScript off and crawlers see all 42 works. JavaScript only runs the checklist and the offline download.
- A service worker caches the page shell on first load; the 42 photographs follow in the background, and the footer reads "Ready to use offline" once they are stored. It then works offline inside the galleries.
- No framework, no server, no dependencies — one `node build.js` and plain files.

## Structure

```
index.html   the page: hand-written shell, generated work cards
data.js      all content: sections, works, blurbs — edit this
build.js     renders data.js into index.html, sw.js, sitemap.xml
img/         43 images at 576px: 42 object photographs + the floor plan
sw.js        service worker: shell precache + background image download
```

## Sources & credit

Object metadata (titles, dates, materials, inventory numbers, provenance) scraped from the museum's own works catalogue at `gulbenkian.pt/museu/en/works/`; each card links to its official page. Blurb texts written for this guide, informed by the museum's catalogue entries. **Object photographs © Fundação Calouste Gulbenkian** — included here at thumbnail size for personal, non-commercial visit use; not affiliated with or endorsed by the FCG. Wall, case and label texts in "From the walls" **© FCG**, transcribed verbatim (English column) from the visitor's own photographs of the in-gallery panels, 18 Jul 2026.

## License

Code (HTML/CSS/JS): [MIT](LICENSE). Original guide texts (intros, blurbs): CC BY 4.0. **Not covered**: object photographs and transcribed wall texts, which remain © Fundação Calouste Gulbenkian — see the scope note in [LICENSE](LICENSE). This is a free, non-profit, independent project, not affiliated with or endorsed by the FCG; rights holders may request removal of material via a [GitHub issue](https://github.com/vicktorhugoqs/gulbenkian-guide/issues).

## Search engines

`indexnow-ping.sh` notifies IndexNow-participating engines (Bing → Copilot/DuckDuckGo) of the three page URLs; run it after deploying content changes. The hex `*.txt` file at root is the IndexNow key and must stay deployed.

## Regenerating

The content is all in `data.js`, which is the file to edit by hand. After any edit to it — or to `img/` — run:

```
node build.js          # writes index.html, sw.js, sitemap.xml
node build.js --check   # exits 1 if anything is out of date
```

`build.js` needs no dependencies. It only rewrites the regions between the `BEGIN GENERATED` / `END GENERATED` markers, so everything else in those files stays hand-written and safe to edit directly. It also reads each JPEG's real dimensions so cards carry `width`/`height`, and derives the cache name from the content, so there is no `CACHE` string to bump by hand.

When reviewing a content change, `git diff -- ':!index.html'` shows the human-authored side; the `index.html` hunks are derived from it.

To link a work from the FAQ or the 2-hour route, `node build.js --report-links` lists each bolded name beside its likely work id — the ids are museum slugs and often do not resemble the name (Germain's tureens are `310846`, the Ulugh Beg jug is `jar`). Write the anchor by hand as `../#w-<id>`; the same command then verifies every anchor resolves.
