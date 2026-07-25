# ERNA gull- og silfursmiðja — redesign concept

Award-level redesign concept for **erna.is** (Skipholt 3, Reykjavík, est. 3 February 1924),
built as a system transplant of `verostudio.com` skinned entirely on ERNA's own material.

**Not deployed. Not sent. ERNA is in summer closure until 4 August 2026.**

Read `DESIGN.md` first. It is the locked system, and section 6.0 is the honesty log.

---

## Run it

```bash
node src/build.mjs && node server.mjs
```

Then open `http://localhost:8791/` (Icelandic) or `http://localhost:8791/en/` (English).

```bash
node qa.mjs      # 26 headless-Chrome checks: mechanisms, a11y, reduced motion, no-JS, EN
node a11y.mjs    # pixel-accurate contrast + tap-target audit
```

Three of those checks exist because measurements can lie: the wordmark landing is asserted
to under 1px on all four edges, the media reveal is proven *reversible* (a CSS transition
would also show intermediates), and the rolling label is checked against scroll position.

`qa.mjs` and `a11y.mjs` need `npm install --no-save puppeteer-core pngjs` and a local
Chrome. The preview pane cannot test this build: it suspends rAF while backgrounded, so
the scrub tween and the stepper freeze and screenshots come back black.

## Layout

```
src/content.mjs    every string, is + en. All prices/years/names verbatim from erna.is
src/template.mjs   the markup, the two-speed headline helper, the punch SVGs
src/build.mjs      renders dist/index.html + dist/en/index.html, favicon, sitemap, robots
public/            styles.css, app.js, img/ (26 ERNA photographs), video/, fonts/
dist/              generated. Static, crawlable, no client-side content rendering
research/          the harvest and the verification contact sheets
qa-shots/          headless captures
```

## The build

- **Concept.** Everything ERNA has made in 102 years ends the same way: struck with a
  mark. The site opens as a hole punched in a plate, that punch divides every section,
  and the three-step process resolves back into it.
- **Palette** sampled out of ERNA's own metal, not chosen. Cold silver `#D3D4D3` and
  near-black `#09070E`, with one warm value taken from their torch flame.
- **Type** from `~/Design fonts/`: Sentient, Supreme, Fragment Mono. All three verified
  for full Icelandic against the font binaries.
- **Motion**: the aperture loader, the two-speed headline, the `--mask-progress` hero
  pinch, the sticky mask stepper. Full easing-token discipline, no default `ease`.
- **Photography**: 26 photographs and one film, every one ERNA's own. No stock, nothing
  generated, nothing upscaled.

## Weight

| | |
|---|---|
| `dist/` total | 4.6 MB |
| images | 2.1 MB across 26 WebP |
| hero film | 1.7 MB, h264, 12s loop, graded cold |
| fonts | 212 KB, 8 woff2 |
| JS | 13 KB, no framework, no dependencies |
| scroll perf | 60.2 fps, 0 long tasks, full-page sweep |
| page height | 13.9 viewports at 1440x900 |

Vero runs ~8 viewports. This runs longer because it carries things Vero does not have:
a real price list, a real hallmark register and a real 102-year timeline. The *pace*
matches (one idea per screen, six headline moments); the page is simply carrying more.

## SEO, against the current site's baseline

| | erna.is today | this build |
|---|---|---|
| `<h1>` per page | 4 | 1 |
| `<title>` | brand name three times, 150+ chars | 50 chars, brand once |
| structured data | none | `JewelryStore` JSON-LD, real hours, founder, offers |
| hreflang | none | is / en / x-default, real second document |
| analytics | 3 GA4 properties + legacy `analytics.js` | none |
| theme | WordPress Twenty Fourteen (2014), Lato | bespoke, self-hosted fonts |
| motion | none | four scroll mechanisms, all reduced-motion safe |

## Open items

- Photography. The archive carries the build, but a real shoot at the bench would
  replace the four weakest frames.
- The Christmas-spoon series ends with the 2026 spoon, the twelfth and last. That is a
  genuine story the current site buries in a paragraph and this build does not yet use.
- Whether a production version keeps WooCommerce or moves to Sanity.
- Icelandic copy has been written carefully but has not had a native second pair of eyes.
