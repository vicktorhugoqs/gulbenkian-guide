# Gulbenkian Museum — Founder's Collection Field Guide

A static, offline-capable visit guide for the [Calouste Gulbenkian Museum](https://gulbenkian.pt/museu/en/) (Lisbon), built for the collection's reopening day, 18 July 2026, after its 16-month renovation.

**Live:** hosted on GitHub Pages from this repo's root.

## What it is

- 42 highlight works in circuit order, grouped into 13 sections (Egypt → Lalique → the new numismatics room), each with a short context essay and section intro.
- A 14th section, "From the walls": the museum's own room, case and object-label texts (English side), transcribed from photographs taken on the reopening-night visit, in circuit order, each linked to the matching guide section.
- Tap the ✓ on a card to mark it seen — progress persists in `localStorage`.
- "Next unseen" button jumps down the route.
- A service worker precaches everything on first load, so it works offline inside the galleries.
- No build step, no framework, no server: `index.html` + `data.js` + `img/`.

## Structure

```
index.html   UI (inline CSS/JS), renders from window.GUIDE
data.js      all content: sections, works, blurbs
img/         42 photographs at 576px
sw.js        precache service worker (regenerate if img/ changes)
```

## Sources & credit

Object metadata (titles, dates, materials, inventory numbers, provenance) scraped from the museum's own works catalogue at `gulbenkian.pt/museu/en/works/`; each card links to its official page. Blurb texts written for this guide, informed by the museum's catalogue entries. **Object photographs © Fundação Calouste Gulbenkian** — included here at thumbnail size for personal, non-commercial visit use; not affiliated with or endorsed by the FCG. Wall, case and label texts in "From the walls" **© FCG**, transcribed verbatim (English column) from the visitor's own photographs of the in-gallery panels, 18 Jul 2026.

## Regenerating

The scraper/generator lived in a session scratchpad; the content is all in `data.js`, which is the file to edit by hand. If images change, rebuild the `ASSETS` list in `sw.js` and bump its `CACHE` version string.
