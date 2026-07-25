import { SITE } from './content.mjs';

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ *
 * The two-speed headline.
 * CAPS words mask-slide translateY(100%) -> 0 over 1.4s ease-out-expo.
 * Italic lowercase words only fade over .6s ease-out-sine.
 * Both share the calc(var(--stagger) * .1s + .55s) cascade.
 * Real whitespace text nodes sit between words so textContent and the
 * accessible name stay clean (redesign-craft-ledger #36c).
 * ------------------------------------------------------------------ */
export function twoSpeed(parts, tag = 'h2', cls = '') {
  const plain = parts.map((p) => p.c ?? p.i).join(' ');
  let i = 0;
  const html = parts
    .map((p) => {
      const s = i++;
      if (p.c !== undefined)
        return `<span class="tw tw--caps" style="--stagger:${s}"><span class="tw-i">${esc(p.c)}</span></span>`;
      return `<em class="tw tw--ital" style="--stagger:${s}"><span class="tw-i">${esc(p.i)}</span></em>`;
    })
    .join(' ');
  return `<${tag} class="ts ${cls}" aria-label="${esc(plain)}"><span aria-hidden="true">${html}</span></${tag}>`;
}

/* The punch. ERNA's own maker's-mark cartouche, one shape, used everywhere. */
export const punchOutline = (cls = 'punch') =>
  `<svg class="${cls}" viewBox="0 0 108 40" aria-hidden="true" focusable="false"><rect x="1.25" y="1.25" width="105.5" height="37.5" rx="12" ry="12" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>`;

/* The same cartouche with the rising sun inside, for divider scale. */
export const punchSun = (cls = 'punch') => `
<svg class="${cls}" viewBox="0 0 108 40" aria-hidden="true" focusable="false">
  <rect x="1.25" y="1.25" width="105.5" height="37.5" rx="12" ry="12" fill="none" stroke="currentColor" stroke-width="2.5"/>
  <g stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none">
    <path d="M42 26 A12 12 0 0 1 66 26"/>
    <path d="M36 26 H72"/>
    <path d="M54 9 V13 M42.5 13.5 L45.4 16.4 M65.5 13.5 L62.6 16.4"/>
  </g>
</svg>`;

/* The full mark: rising sun over GAM over 925, as ERNA describe it on their
   Stimplasíða. Geometry only for the sun so it survives without webfonts. */
export const punchMark = (cls = 'mark') => `
<svg class="${cls}" viewBox="0 0 108 108" role="img" aria-label="Stimpill ERNU: GAM undir rísandi sól, 925">
  <rect x="2" y="2" width="104" height="104" rx="26" ry="26" fill="none" stroke="currentColor" stroke-width="3"/>
  <g stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none">
    <path d="M36 42 A18 18 0 0 1 72 42"/>
    <path d="M30 42 H78"/>
    <path d="M54 17 V23 M37.3 24.3 L41.5 28.5 M70.7 24.3 L66.5 28.5"/>
  </g>
  <text x="54" y="70" text-anchor="middle" font-family="Supreme, system-ui, sans-serif" font-size="21" font-weight="500" letter-spacing="1" fill="currentColor">GAM</text>
  <text x="54" y="90" text-anchor="middle" font-family="Supreme, system-ui, sans-serif" font-size="15" letter-spacing="1.5" fill="currentColor">925</text>
</svg>`;

const divider = () => `<div class="divider" aria-hidden="true"><span class="divider-r"></span>${punchSun('divider-p')}<span class="divider-r"></span></div>`;

const inlineBtn = (href, label, extra = '') =>
  `<a class="ib" href="${esc(href)}"${extra}><span>${esc(label)}</span></a>`;

const img = (name, alt, cls = '', extra = '') =>
  `<img class="${cls}" src="../img/${name}" alt="${esc(alt)}" loading="lazy" decoding="async"${extra}>`;

/* ------------------------------------------------------------------ */

export function render(c, { assetBase, previewOrigin = '', noindex = false }) {
  const A = assetBase; // '' for /, '../' for /en/
  const ORIGIN = previewOrigin || SITE.origin;
  const im = (name, alt, cls = '', extra = '') =>
    `<img class="${cls}" src="${A}img/${name}" alt="${esc(alt)}" loading="lazy" decoding="async"${extra}>`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    name: SITE.brandFull,
    alternateName: 'ERNA',
    url: ORIGIN,
    description: c.description,
    foundingDate: SITE.founded,
    founder: { '@type': 'Person', name: SITE.founder },
    telephone: SITE.phoneTel,
    email: SITE.email,
    priceRange: '$$$',
    currenciesAccepted: 'ISK',
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.street,
      postalCode: SITE.postal,
      addressLocality: SITE.city,
      addressCountry: 'IS',
    },
    geo: { '@type': 'GeoCoordinates', latitude: 64.1387, longitude: -21.9016 },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '11:00',
        closes: '17:00',
      },
    ],
    sameAs: [SITE.instagramUrl],
    makesOffer: [
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Handsmíðaðir trúlofunar- og giftingarhringar, 14k' }, price: '159000', priceCurrency: 'ISK' },
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Barnaskeið úr 925 sterling silfri' }, price: '39500', priceCurrency: 'ISK' },
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Jólaskeiðin' }, price: '33500', priceCurrency: 'ISK' },
    ],
  };

  /* ---------------- heirloom diptych: one sticky column, objects scroll ---- */
  const heirloomItems = c.heirlooms.items
    .map(
      (h, i) => `
    <article class="hl" id="${esc(h.id)}">
      <div class="hl-media js-rv">${im(h.img, h.alt, 'hl-img')}</div>
      <div class="hl-txt">
        <p class="reg hl-moment" data-n="${String(i + 1).padStart(2, '0')}">${esc(h.moment)}</p>
        <h3 class="hl-h">${esc(h.title)}</h3>
        <p class="hl-b">${esc(h.body)}</p>
        <p class="hl-price"><span>${esc(h.price)}</span><span class="reg hl-note">${esc(h.note)}</span></p>
      </div>
    </article>`
    )
    .join('');

  /* ---------------- sticky mask stepper ---------------------------------- */
  const stepMasks = c.process.steps
    .map(
      (s, i) => `
      <div class="fs" data-step="${i}" style="--i:${i}">
        <div class="fs-media">${im(s.img, s.alt, 'fs-img', i === 0 ? '' : '')}</div>
        <div class="fs-body">
          <p class="reg fs-n">${esc(s.n)}</p>
          <p class="fs-word">${esc(s.word)}</p>
          <h3 class="fs-h">${esc(s.title)}</h3>
          <p class="fs-b">${esc(s.body)}</p>
        </div>
      </div>`
    )
    .join('');

  const stepTicks = c.process.steps
    .map((s, i) => `<li class="pg-t" data-tick="${i}"><span class="reg">${esc(s.n)}</span><span class="pg-w">${esc(s.word)}</span></li>`)
    .join('');

  /* ---------------- register of marks ------------------------------------ */
  const markRows = c.marks.items
    .map(
      (m) => `
      <li class="mk">
        <div class="mk-img">${im(m.img, m.alt)}</div>
        <div class="mk-txt">
          <p class="mk-code">${esc(m.code)}</p>
          <p class="reg mk-who">${esc(m.who)}, ${esc(m.life)}</p>
          <p class="mk-b">${esc(m.body)}</p>
        </div>
      </li>`
    )
    .join('');

  /* ---------------- timeline --------------------------------------------- */
  const tl = c.story.timeline
    .map((t) => `<li class="tl-i"><span class="reg tl-y">${esc(t.y)}</span><span class="tl-t">${esc(t.t)}</span></li>`)
    .join('');

  const archive = c.story.archive
    .map((a) => `<figure class="ar-f"><div class="ar-m js-rv">${im(a.img, a.alt)}</div><figcaption class="reg">${esc(a.is)}</figcaption></figure>`)
    .join('');

  /* ---------------- price index: rows drive one image panel -------------- */
  let pi = -1;
  const priceRows = c.prices.items
    .map((p) => {
      if (p.group) return `<li class="pr-g"><span class="reg">${esc(p.group)}</span></li>`;
      pi += 1;
      return `<li class="pr-r"><button class="pr-b" type="button" data-pr="${pi}" aria-describedby="pr-panel"><span class="pr-name">${esc(p.name)}</span><span class="reg pr-price">${esc(p.price)}</span></button></li>`;
    })
    .join('');

  const priceImgs = c.prices.items
    .filter((p) => !p.group)
    .map((p, i) => `<img class="pr-img${i === 0 ? ' is-on' : ''}" data-pri="${i}" src="${A}img/${p.img}" alt="${esc(p.alt)}" loading="lazy" decoding="async">`)
    .join('');

  const contactRows = c.contact.rows
    .map(
      (r) =>
        `<div class="ct-r"><dt class="reg">${esc(r.k)}</dt><dd>${r.href ? `<a href="${esc(r.href)}">${esc(r.v)}</a>` : esc(r.v)}</dd></div>`
    )
    .join('');

  const navLinks = c.nav.map((n) => `<li><a href="${esc(n.href)}">${esc(n.label)}</a></li>`).join('');
  const navLinksM = c.nav
    .map((n, i) => `<li style="--i:${i}"><a href="${esc(n.href)}">${esc(n.label)}</a></li>`)
    .join('');

  return `<!doctype html>
<html lang="${c.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(c.title)}</title>
<meta name="description" content="${esc(c.description)}">
<meta name="theme-color" content="#09070E">
<link rel="canonical" href="${ORIGIN}${c.dir}">
${noindex ? '<meta name="robots" content="noindex, nofollow">\n' : ''}
<link rel="alternate" hreflang="is" href="${ORIGIN}/">
<link rel="alternate" hreflang="en" href="${ORIGIN}/en/">
<link rel="alternate" hreflang="x-default" href="${ORIGIN}/">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(c.title)}">
<meta property="og:description" content="${esc(c.description)}">
<meta property="og:locale" content="${c.lang === 'is' ? 'is_IS' : 'en_GB'}">
<meta property="og:image" content="${ORIGIN}${c.dir}img/hero-poster.webp">
<link rel="icon" href="${A}favicon.svg" type="image/svg+xml">
<link rel="preload" href="${A}fonts/Sentient-Light.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${A}fonts/Supreme-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" as="image" href="${A}img/hero-poster.webp" fetchpriority="high">
<link rel="stylesheet" href="${A}styles.css">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body class="is-loading">

<a class="skip" href="#main">${esc(c.skip)}</a>

<!-- ---------------------------------------------------------------- A. the aperture -->
<div class="loader" id="loader" aria-hidden="true">
  <div class="loader-plate"></div>
  <div class="loader-txt loader-txt--top"><span class="lt-i">${esc(c.loader.top)}</span></div>
  <div class="loader-txt loader-txt--bot"><span class="lt-i">${esc(c.loader.bottom)}</span></div>
</div>

<header class="hdr" id="hdr">
  <div class="hdr-in">
    <a class="hdr-home" href="${c.lang === 'is' ? './' : '../'}" aria-label="${esc(SITE.brandFull)}">
      <span class="hdr-mark">${punchOutline('hdr-punch')}</span>
      <span class="hdr-name">ERNA</span>
    </a>
    <nav class="hdr-nav" aria-label="${c.lang === 'is' ? 'Aðalvalmynd' : 'Main'}">
      <ul>${navLinks}</ul>
    </nav>
    <div class="hdr-end">
      <a class="hdr-lang" href="${esc(c.other.href)}" hreflang="${esc(c.other.code)}" lang="${esc(c.other.code)}">${esc(c.other.label)}</a>
      <a class="hdr-cta" href="#hafa-samband">${esc(c.navCta)}</a>
      <button class="burger" id="burger" type="button" aria-expanded="false" aria-controls="menu" aria-label="${c.lang === 'is' ? 'Opna valmynd' : 'Open menu'}">
        <span></span><span></span>
      </button>
    </div>
    <span class="hdr-prog" aria-hidden="true"></span>
  </div>
</header>

<div class="menu" id="menu" hidden>
  <nav aria-label="${c.lang === 'is' ? 'Valmynd' : 'Menu'}">
    <ul class="menu-list">${navLinksM}</ul>
  </nav>
  <div class="menu-foot">
    <a href="tel:${SITE.phoneTel}">${SITE.phone}</a>
    <a href="${esc(c.other.href)}" hreflang="${esc(c.other.code)}" lang="${esc(c.other.code)}">${esc(c.other.label)}</a>
  </div>
</div>

<!-- ---------------------------------------------------------------- B. hero -->
<div class="wordmark" id="wordmark" aria-hidden="true"><span>ERNA</span></div>

<main id="main">
<section class="hero" id="hero">
  <div class="hero-mask" id="heroMask">
    <video class="hero-v" id="heroV" poster="${A}img/hero-poster.webp" autoplay muted loop playsinline preload="metadata" aria-label="${esc(c.hero.alt)}">
      <source src="${A}video/hendur.mp4" type="video/mp4">
    </video>
    <img class="hero-fallback" src="${A}img/hero-poster.webp" alt="${esc(c.hero.alt)}" fetchpriority="high" decoding="async">
  </div>
  <h1 class="hero-h1">
    <span class="hero-h1-name">ERNA</span>
    <span class="hero-h1-sub">${esc(c.hero.standfirst)}</span>
  </h1>
  <div class="hero-meta reg">
    <span>${esc(c.hero.meta[0])}</span>
    <span>${esc(c.hero.meta[1])}</span>
  </div>
</section>

<!-- ---------------------------------------------------------------- C. thesis -->
<section class="sec sec--sheet thesis" id="thesis">
  <div class="wrap">
    ${twoSpeed(c.thesis.title, 'h2', 'ts--head')}
    <div class="thesis-grid">
      <p class="lede">${esc(c.thesis.body)}</p>
      <figure class="pull">
        <blockquote><p>${esc(c.thesis.pull)}</p></blockquote>
        <figcaption class="reg">${esc(c.thesis.pullSource)}</figcaption>
      </figure>
    </div>
    <p class="thesis-cta">${inlineBtn(c.thesis.cta.href, c.thesis.cta.label)}</p>
  </div>
  ${divider()}
</section>

<!-- ---------------------------------------------------------------- D. diptych -->
<section class="sec sec--sheet dip" id="gengur-a-milli">
  <div class="dip-in">
    <div class="dip-stick">
      ${twoSpeed(c.heirlooms.title, 'h2', 'ts--mid')}
      <p class="dip-lead">${esc(c.heirlooms.lead)}</p>
      <div class="dip-now" aria-hidden="true">
        ${c.heirlooms.items
          .map((h, i) => `<span class="dip-now-i${i === 0 ? ' is-on' : ''}" data-di="${i}">${esc(h.title)}</span>`)
          .join('')}
      </div>
      <p class="dip-count reg"><span id="dipCount">01</span> / ${String(c.heirlooms.items.length).padStart(2, '0')}</p>
      <div class="dip-rail" aria-hidden="true"><span class="dip-rail-f"></span></div>
    </div>
    <div class="dip-scroll">${heirloomItems}</div>
  </div>
</section>

<!-- ---------------------------------------------------------------- E. stepper -->
<section class="sec sec--plate step" id="smidin">
  <div class="wrap step-head">
    ${twoSpeed(c.process.title, 'h2', 'ts--mid')}
    <p class="step-lead">${esc(c.process.lead)}</p>
  </div>
  <div class="stepper" id="stepper">
    <div class="rail-vp">
      <div class="rail-track" id="railTrack">${stepMasks}</div>
      <div class="pg" aria-hidden="true"><ol class="pg-l">${stepTicks}</ol></div>
      <div class="rail-prog" aria-hidden="true"><span></span></div>
    </div>
  </div>
  <div class="step-res">
    <div class="res-punch" id="resPunch">${punchMark('res-mark')}</div>
    <p class="reg res-t">${esc(c.process.resolve)}</p>
  </div>
</section>

<!-- ---------------------------------------------------------------- F. the mark -->
<section class="sec sec--plate marks" id="stimpillinn">
  <figure class="plate-fig js-par">
    ${im('stimplaplata.webp', c.marks.plateAlt, 'plate-img')}
  </figure>
  <div class="wrap">
    ${twoSpeed(c.marks.title, 'h2', 'ts--mid')}
    <p class="marks-lead">${esc(c.marks.lead)}</p>
    <p class="reg marks-label">${esc(c.marks.registerLabel)}</p>
    <ul class="mk-l">${markRows}</ul>
    <p class="marks-link">${inlineBtn(c.marks.link.href, c.marks.link.label, ' rel="noopener" target="_blank"')}</p>
  </div>
</section>

<!-- ---------------------------------------------------------------- G. history -->
<section class="sec sec--sheet story" id="sagan">
  <div class="wrap">
    ${twoSpeed(c.story.title, 'h2', 'ts--mid')}
    <div class="story-top">
      <figure class="fnd">
        ${im('gudlaugur.webp', c.story.founderAlt, 'fnd-img')}
        <figcaption class="reg">${esc(c.story.founderCaption)}</figcaption>
      </figure>
      <p class="story-lead">${esc(c.story.lead)}</p>
    </div>
    <ol class="tl"><span class="tl-rail" aria-hidden="true"><span class="tl-rail-f"></span></span>${tl}</ol>
    <figure class="qt">
      <blockquote><p>${esc(c.story.quote)}</p></blockquote>
      <figcaption class="reg">${esc(c.story.quoteBy)}</figcaption>
    </figure>
    <div class="ar">${archive}</div>
  </div>
  ${divider()}
</section>

<!-- ---------------------------------------------------------------- H. prices -->
<section class="sec sec--sheet pr" id="verdskra">
  <div class="wrap">
    <p class="reg pr-eyebrow">${esc(SITE.brandFull)}</p>
    <h2 class="h-plain">${esc(c.prices.title)}</h2>
    <p class="pr-lead">${esc(c.prices.lead)}</p>
    <div class="pr-in">
      <ul class="pr-l" id="prList">
        <li class="pr-h reg"><span>${esc(c.prices.colItem)}</span><span>${esc(c.prices.colPrice)}</span></li>
        ${priceRows}
      </ul>
      <div class="pr-panel" id="pr-panel">${priceImgs}</div>
    </div>
    <p class="reg pr-note">${esc(c.prices.note)}</p>
  </div>
</section>

<!-- ---------------------------------------------------------------- I. contact -->
<section class="sec sec--plate ct" id="hafa-samband">
  <div class="wrap">
    ${twoSpeed(c.contact.title, 'h2', 'ts--head')}
    <p class="ct-lead">${esc(c.contact.lead)}</p>
    <p class="ct-notice"><span class="reg">${esc(c.contact.noticeLabel)}</span> ${esc(c.contact.notice)}</p>
    <dl class="ct-l">${contactRows}</dl>
    <p class="ct-btns">
      ${inlineBtn(c.contact.cta.href, c.contact.cta.label)}
      ${inlineBtn(c.contact.cta2.href, c.contact.cta2.label)}
    </p>
    <p class="reg ct-ship">${esc(c.contact.shipping)}</p>
  </div>
</section>
</main>

<footer class="ft">
  <div class="wrap ft-in">
    <div class="ft-mark">${punchMark('ft-punch')}</div>
    <div class="ft-txt">
      ${c.footer.lines.map((l) => `<p>${esc(l)}</p>`).join('')}
      <p class="reg ft-years">${esc(c.footer.years)}</p>
    </div>
    <div class="ft-end reg">
      <p>${esc(c.footer.credit)}</p>
      <p class="ft-note">${esc(c.footer.note)}</p>
    </div>
  </div>
</footer>

<script src="${A}app.js" defer></script>
</body>
</html>
`;
}
