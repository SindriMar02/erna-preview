# ERNA gull- og silfursmiðja — DESIGN.md

Locked before build. Transplant of the Vero Studio *system* (see `../vero-teardown-erna.md`),
reskinned entirely on ERNA's own material. Nothing from Vero's skin survives.

---

## 0. The one sentence for the owner

> Everything ERNA has made in 102 years ends the same way: struck with a mark.
> The site opens as a hole punched in a plate, that same punch divides every section,
> and the three-step process resolves back into it.

## 1. The brand-drawn idea — the punch

ERNA's own maker's mark, described verbatim on their Stimplasíða:

> „Algengasti silfurstimpill hér á landi er samsetning upphafsstafa Guðlaugs A.
> Magnússonar (GAM) undir rísandi sól. Neðst í stimplinum er hlutfallstala sterling
> silfurs 925. Hann mun hafa verið tekinn í notkun árið 1946."

Verified against photographs of real struck ERNA marks (`GAM 14K` inside a ring,
the `830S / Made in Iceland / AK` triple punch, the `925S` bar punches): every ERNA
punch face is a **rounded-corner rectangular cartouche**, letters slightly condensed,
struck not printed.

That cartouche is used, one shape, five places:

| Use | Form |
|---|---|
| Loader aperture | the cartouche is the hole cut out of the plate |
| Section divider | the cartouche outline, hairline, centred |
| List bullet / index marker | the cartouche at 6px |
| Process stepper resolution | the three steps end inside the cartouche |
| Favicon | the cartouche with the rising sun + GAM + 925 |

Nothing generated. Nothing borrowed. Drawn from their published mark and their own photos.

## 2. Palette — sampled from ERNA's own metal

Every value below was quantised out of an ERNA photograph, not chosen.

| Token | Hex | Sampled from |
|---|---|---|
| `--sheet` | `#D3D4D3` | body silver, `SDagstjarna` / `SBlagresi` napkin rings |
| `--sheet-dim` | `#BCBBBB` | same, shadow side |
| `--smoke` | `#928F8A` | oxidised silver in the same frames |
| `--steel` | `#67757D` | **the hallmark plate itself** (`stimplaplata2`) — cold blue-grey |
| `--steel-dk` | `#585F60` | same plate, struck marks |
| `--plate` | `#09070E` | ground of the Reykjavík flatware shot |
| `--plate-2` | `#14151A` | lifted plate, for cards on dark |
| `--chrome` | `#F2F3F3` | polish highlight, same flatware shot |
| `--ember` | `#C59983` | **the torch flame** in `mynd1.jpg`, ERNA's own crucible photo |

**Two grounds, alternating: `--sheet` (cold silver) and `--plate` (near-black).**
`--ember` is the only warm value in the build and appears in exactly two places:
the *eldurinn* plate, and focus/hover states. It is never decoration.

Explicitly rejected: Vero's `#f3f0ed` bone canvas and `#e97e00` orange. Cream + warm
metal is the banned AI premium-craft default and is materially wrong for a silversmith.

## 3. Type

Picked from `~/Design fonts/`, all three machine-verified for full Icelandic
(Á Ð É Í Ó Ú Ý Þ Æ Ö á ð é í ó ú ý þ æ ö) against the actual font binaries.

| Role | Face | Why, on ERNA's terms |
|---|---|---|
| Display | **Sentient** (ITF, FFL) Light / Light Italic | An old-style serif is a *struck* letterform: cut in reverse into a steel punch, driven into a matrix. It is the same tool and the same gesture as a hallmark. Its true italic supplies the lowercase half of the two-speed reveal. |
| Body / UI | **Supreme** Regular / Medium | Neutral neo-grotesque. Gets out of the way so the silver is the only thing with character. |
| Register | **Fragment Mono** Regular | Years, prices, karat, assay figures, captions. A hallmark register is a typed ledger of codes; ERNA publishes exactly such a table. |

Banned and not used: Louize Display, Beausite Classic (Vero's), Fraunces, Instrument Serif.

Scale, Vero's ladder retargeted, canvas 1728px:

```
--font-header    300 clamp(46px, 5.1vw, 118px) / 1.02   Sentient Light
--font-display-1 300 2.875rem / 1.08
--font-display-2 300 2.1875rem / 1.06
--font-display-3 400 1.5rem / 1.32
--font-display-4 500 1.125rem / 1.2      Supreme
--font-body      400 1.0625rem / 1.62    Supreme
--font-register  400 .75rem / 1.5        Fragment Mono, .14em tracking, uppercase
```

Two weights per family, no more. Icelandic headline safety: leading never below 1.02
at display size and **no overflow mask on any line carrying Á Í Ó Ú Ý É** (ledger #23) —
the mask-slide reveal is applied per word inside a wrapper with 0.22em top padding, and
accented display lines are checked in QA.

## 4. Motion — the four transplanted mechanisms

Full easing-token discipline. **No default `ease` anywhere in the build.**

```
--ease-in-out-quint .83,0,.17,1     --ease-out-expo   .19,1,.22,1
--ease-in-out-quart .76,0,.24,1     --ease-out-quart  .25,1,.5,1
--ease-out-sine     .61,1,.88,1     --ease-in-quint   .64,0,.78,0
--ease-custom-1     .25,.1,.25,1    --ease-in-out-sine .37,0,.63,1
--ease-out-cubic    .33,1,.68,1     --ease-in-out-cubic .65,0,.35,1
```

**A. Aperture loader.** Fixed `--plate` sheet, punch cartouche cut out with dual
`mask-image` + `mask-composite: exclude`. `--hole-w: 15.6vw`, `--hole-ratio: 100lvh/100vw`.
`1924` above, `2026` below, pushed apart by `calc(-1 * var(--hole-h)/2)`.
Enter: `mask-expand` 1.4s / .5s delay / quint. Exit on `.loaded`: `mask-full` .7s / .15s /
quart, text `slide-out` .7s in-quint with `--y-out: -25%` / `+25%`.
`@media (scripting: none) { display: none }`.

**B. Two-speed headline reveal.** The signature.
CAPS words: `translateY(100%) -> 0`, `1.4s var(--ease-out-expo)`, masked.
Italic lowercase: `opacity 0 -> 1`, `.6s var(--ease-out-sine)`, no transform.
Shared cascade `calc(var(--stagger) * .1s + .55s)`. Two-stage gate:
`.is-title-visible` (container opacity .3s custom-1) then `.is-title-revealed`.

**C. Hero pinch and wordmark flight.** JS writes one variable, `--mask-progress`. CSS does everything:
`--mask-scale-h: calc(1 - .3 * max(0, var(--mask-progress) - .1))`,
`--mask-scale-v: calc(1 - .3 * var(--mask-progress))`, centred `clip-path: polygon(...)`,
`transition: clip-path .2s var(--ease-out-quart)`. Height `100svh`, never `100vh`.
Video held at `scale(1.01)`. Wordmark is `position: fixed`, driven independently, flies
hero-centre → header.

The flight scale comes from the **font-size ratio, never from bounding-rect heights** — a
rect's height is the line box, not the glyph box. The first build scaled by rect height
and overshot the landing width by **42.7px**, which read as the mark not quite hitting its
slot. A uniform scale can only land if both renderings share line-height and tracking, so
`.hdr-name` now matches `.wordmark span` on both and differs only in font-size. Landing
error is asserted in QA at **under 1px on all four edges** (currently 0.02px).

**D. Sticky mask stepper.** `silfrið → eldurinn → stimpillinn`. Sticky `.masks` layer,
three stacked sticky children revealed by mask, not fade. Resolves into the punch cartouche.

Also: `DiptychStickyMedia` (one column pinned, the other scrolls past) for the heirloom
objects. `InlineButton` two-layer underline, `background-size: 0% 1px, 100% 1px` →
`0%, 0%` → `100% 1px, 0%` — retract then redraw, no pseudo-elements.

**E. Scrubbed feathered reveal (revision 2).** Every media frame carries `--rv`, written
from its own `getBoundingClientRect()` each frame, driving a feathered `mask-image` stop
plus a small counter-drift `--par`. This replaced a one-shot IntersectionObserver
`clip-path: inset()`, whose hard edge is what made sections *pop* rather than arrive.
Technique borrowed from 21st.dev's Ghost Reveal (animated mask, not a wipe); nothing
vendored, since the build is vanilla. Because it reads position rather than a trigger, a
deep link or a resize lands on the correct state, and it is **reversible** — scroll back
and the value falls again. That reversibility is the QA assertion, because a CSS
transition also shows intermediates and therefore proves nothing on its own.

**F. The rolling label (revision 2).** `DressDiscover`, the Vero component skipped in the
first pass. The sticky diptych column shows the current object's name entering
`translateY(105%) -> 0` while the previous leaves `0 -> -105%`, over a scroll-drawn
progress rail. Structure taken from 21st.dev's *Scroll Reveal Content A* (numbered blocks
+ growing progress line + synchronized panel).

Performance: all rects are **read** in one pass, then all custom properties **written**,
so a write never invalidates style ahead of the next read. Measured 60.2 fps with zero
long tasks over a full-page scroll sweep.

`prefers-reduced-motion: reduce` collapses every mechanism to a plain, fully visible render.

## 5. Pace

8 viewports. **6 headline moments.** One idea per screen. Density dial low on purpose.

```
0  aperture loader                    1924 / 2026
1  hero film, wordmark flight, pinch  ERNA
2  thesis                             (1) hlutirnir sem lifa okkur
3  heirloom diptychs, sticky          (2) það sem gengur á milli
4  process stepper, sticky masks      (3) silfrið / eldurinn / stimpillinn
5  the hallmark plate, full bleed     (4) merkið
6  1924, founder, the workshop        (5) sama fjölskyldan síðan 1924
7  the objects, index                 —      (real prices, real names)
8  komdu í Skipholt 3                 (6) contact, hours, closure notice
```

## 6. Honesty guardrails

### 6.0 What was caught in QA and corrected

Three factual defects reached a build and were caught by looking at the rendered
pages, not by the metrics (every automated check was green while all three were live).

1. **The founder quote is not the founder's.** The brief and the teardown both treat
   „Gerum hversdaginn að hátíð en hátíðina aldrei hversdagslega" as ERNA's own founder
   line. It is not: erna.is credits it, on the same line, to **Finn Schjøll, hönnuður**,
   a Norwegian designer. It is used here with that attribution intact, and the *thesis*
   role it was meant to fill went to a sentence ERNA actually wrote themselves.
2. **Six image and caption mismatches.** Assets were mapped from a montage contact sheet
   whose labels silently shifted whenever a file failed to open. The result was four
   Pierre Lannier watches (a brand ERNA *retails*, not makes) captioned as ERNA's own
   hand forged 14k wedding rings at 159.000 kr., a napkin ring captioned as the 2025
   Christmas spoon, and a ring macro captioned as workshop staff. All six were replaced
   with individually verified files. **Never map an asset from a montage.** Render the
   caption together with the file, one at a time, and look at it.
3. **A caption with no evidence behind it.** A figure captioned as an 1898 newspaper
   advertisement was in fact a 2021 macro of an 830S hallmark. The real advertisement
   could not be identified with confidence in the media library, so the figure was
   removed rather than recaptioned on a guess.



- Every price, size, year and name on the page is lifted verbatim from erna.is.
- The summer-closure notice (lokað 6. júlí til 4. ágúst) stays on the page.
- **No stock, no generated imagery, nothing synthetic.** 26 photographs and one film,
  all ERNA's own. Higgsfield was available with 2975 credits and was deliberately not
  used: their archive already contained a real photograph of a torch melting glowing
  silver in the workshop crucible, which is stronger than any generated plate, and
  upscaling the 194px founder portrait would have invented facial detail for a real
  named person who died in 1952.
- The founder portrait runs at archive scale (184px) for that reason.
- No em-dashes in customer-facing copy.

## 7. SEO floor (the current site's baseline is the bar)

Current site: WordPress Twenty Fourteen, four `<h1>`s, brand name three times in
`<title>`, three GA4 properties. This build ships:

- Static crawlable HTML, no client-side rendering of content
- Exactly one `<h1>` per document
- `<title>` under 60 chars, brand once
- `LocalBusiness` / `JewelryStore` JSON-LD with real address, phone, opening hours,
  founding date, founder
- `hreflang` is / en / x-default, real second document at `/en/`
- Descriptive `alt` on every image, `loading="lazy"` below the fold, `fetchpriority="high"`
  on the hero poster
- Zero analytics
