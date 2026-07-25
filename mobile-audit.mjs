import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE || 'http://localhost:8791';
const OUT = 'qa-shots/mobile';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DEVICES = [
  { name: 'iPhone-SE',      w: 320, h: 568, dpr: 2 },
  { name: 'iPhone-mini',    w: 375, h: 667, dpr: 2 },
  { name: 'iPhone-14',      w: 390, h: 844, dpr: 3 },
  { name: 'iPhone-Pro-Max', w: 430, h: 932, dpr: 3 },
  { name: 'iPad-portrait',  w: 768, h: 1024, dpr: 2 },
  { name: 'tablet-1000',    w: 1000, h: 800, dpr: 2 },
];

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  userDataDir: '/private/tmp/claude-501/-Users-sindri-Documents-Website-redesign-mockups/3b1f3e1c-861e-4803-a898-6759669caedf/scratchpad/chrome-mob',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--force-color-profile=srgb'],
});

const issues = [];
const flag = (dev, kind, detail) => issues.push(`[${dev}] ${kind}: ${detail}`);

for (const d of DEVICES) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setViewport({ width: d.w, height: d.h, deviceScaleFactor: d.dpr, isMobile: true, hasTouch: true });
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }],
  });

  await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 45000 });
  await page.waitForFunction(() => document.body.classList.contains('loaded'), { timeout: 15000 });
  await sleep(2200);

  // force every image in so nothing is judged on a lazy-load race
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    const all = Array.from(document.images);
    all.forEach((i) => { i.loading = 'eager'; });
    await Promise.allSettled(all.map((i) => i.decode().catch(() => {})));
  });
  await sleep(600);

  /* ---- horizontal overflow, measured per element, not just on the document ---- */
  const of = await page.evaluate(() => {
    // scrollWidth counts oversized-but-clipped children (media is deliberately
    // 105% wide so blur cannot pull transparency in at the edges). The real
    // question is whether the viewport can actually be scrolled sideways.
    scrollTo(60, 0); const canScrollX = window.scrollX; scrollTo(0, 0);
    const docOver = canScrollX;
    const bad = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed') return;
      let n = el.parentElement, isClipped = false;
      while (n && n !== document.documentElement) {
        if (/hidden|clip/.test(getComputedStyle(n).overflowX)) { isClipped = true; break; }
        n = n.parentElement;
      }
      if (isClipped) return;
      if (r.right > innerWidth + 1.5 || r.left < -1.5) {
        bad.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').filter(Boolean)[0] || '?'} ` +
                 `[${Math.round(r.left)}..${Math.round(r.right)}]`);
      }
    });
    return { docOver, bad: [...new Set(bad)].slice(0, 8) };
  });
  if (of.docOver > 0) flag(d.name, 'HORIZONTAL SCROLL POSSIBLE', of.docOver + 'px');
  if (of.bad.length) flag(d.name, 'ELEMENT OVERFLOW', of.bad.join(' | '));

  /* ---- tap targets ---- */
  const taps = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('a[href], button').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      if (getComputedStyle(el).visibility === 'hidden') return;
      if (r.height < 24 || r.width < 24) bad.push(`${(el.textContent || '').trim().slice(0, 22)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    });
    return bad;
  });
  if (taps.length) flag(d.name, 'SMALL TAP TARGET', taps.join(' | '));

  /* ---- text that is too small to read on a phone ---- */
  const tiny = await page.evaluate(() => {
    const bad = new Set();
    document.querySelectorAll('p, li, dd, dt, span, a, h1, h2, h3, figcaption').forEach((el) => {
      if (!el.textContent.trim() || el.children.length) return;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none') return;
      const px = parseFloat(s.fontSize);
      if (px < 11.5) bad.add(`${String(el.className).split(' ')[0] || el.tagName.toLowerCase()} ${px}px`);
    });
    return [...bad];
  });
  if (tiny.length) flag(d.name, 'TEXT UNDER 11.5px', tiny.join(' | '));

  /* ---- long Icelandic words breaking out of their box ---- */
  const clipped = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('h1, h2, h3, .fs-word, .hl-h, .mk-code, .dip-now-i, .pr-name').forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 2) {
        bad.push(`${String(el.className).split(' ')[0]} "${el.textContent.trim().slice(0, 20)}" ${el.scrollWidth}>${el.clientWidth}`);
      }
    });
    return bad;
  });
  if (clipped.length) flag(d.name, 'TEXT CLIPPED', clipped.join(' | '));

  /* ---- the process rail must be a vertical stack here ---- */
  if (d.w < 1024) {
    const rail = await page.evaluate(() => {
      const vp = document.querySelector('.rail-vp'), tr = document.querySelector('#railTrack');
      const panels = [...document.querySelectorAll('.fs')];
      return {
        pos: getComputedStyle(vp).position,
        transform: getComputedStyle(tr).transform,
        stacked: panels.every((e, i, a) => i === 0 || e.getBoundingClientRect().top >= a[i - 1].getBoundingClientRect().top + 100),
        copyVisible: panels.every((e) => Number(getComputedStyle(e.querySelector('.fs-body')).opacity) > 0.9),
      };
    });
    if (rail.pos !== 'static' || rail.transform !== 'none' || !rail.stacked || !rail.copyVisible) {
      flag(d.name, 'RAIL FALLBACK', JSON.stringify(rail));
    }
  }

  /* ---- burger + menu ---- */
  const burger = await page.evaluate(() => {
    const b = document.querySelector('#burger');
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { visible: getComputedStyle(b).display !== 'none', top: Math.round(r.top),
             reachable: !!(hit && hit.closest('#burger')) };
  });
  if (d.w < 930 && (!burger.visible || !burger.reachable)) flag(d.name, 'BURGER', JSON.stringify(burger));
  if (d.w < 930) {
    await page.click('#burger');
    await sleep(800);
    const menu = await page.evaluate(() => {
      const m = document.querySelector('#menu');
      const links = [...m.querySelectorAll('a')];
      return { open: m.classList.contains('is-open'),
               allInView: links.every((a) => { const r = a.getBoundingClientRect(); return r.top >= -2 && r.bottom <= innerHeight + 2; }),
               overflow: m.scrollHeight > m.clientHeight + 2,
               n: links.length };
    });
    if (!menu.open || !menu.allInView || menu.overflow) flag(d.name, 'MENU', JSON.stringify(menu));
    await page.screenshot({ path: `${OUT}/${d.name}-menu.png` });
    await page.evaluate(() => document.querySelector('#burger').click());
    await sleep(700);
  }

  /* ---- price panel must follow scroll where there is no hover ---- */
  await page.evaluate(() => document.querySelector('#verdskra').scrollIntoView({ block: 'start' }));
  await sleep(700);
  const pA = await page.evaluate(() => document.querySelector('.pr-img.is-on')?.dataset.pri);
  await page.evaluate(() => scrollBy(0, 800));
  await sleep(900);
  const pB = await page.evaluate(() => document.querySelector('.pr-img.is-on')?.dataset.pri);
  if (pA === pB) flag(d.name, 'PRICE PANEL', `did not follow scroll (${pA} -> ${pB})`);

  /* ---- section shots ---- */
  for (const id of ['hero', 'thesis', 'gengur-a-milli', 'smidin', 'stimpillinn', 'sagan', 'verdskra', 'hafa-samband']) {
    await page.evaluate((s) => {
      const el = s === 'hero' ? null : document.querySelector('#' + s);
      if (el) el.scrollIntoView({ block: 'start' }); else scrollTo(0, 0);
    }, id);
    await sleep(750);
    await page.screenshot({ path: `${OUT}/${d.name}-${id}.png` });
  }

  /* ---- broken images at this width ---- */
  const broken = await page.evaluate(() =>
    Array.from(document.images).filter((i) => i.naturalWidth === 0).map((i) => i.getAttribute('src')));
  if (broken.length) flag(d.name, 'BROKEN IMAGE', broken.join(', '));

  /* ---- upscale check at this dpr ---- */
  // CSS upscale, not device-pixel ratio: every non-retina asset is "2-3x" on a
  // dpr3 phone, which says nothing. Stretching an image past its own pixel
  // width is the actual defect.
  const up = await page.evaluate(() => Array.from(document.images)
    .filter((i) => i.naturalWidth)
    .map((i) => ({ s: i.getAttribute('src').split('/').pop(),
                   u: +(i.getBoundingClientRect().width / i.naturalWidth).toFixed(2) }))
    .filter((o) => o.u > 1.3));
  // Verified by eye at desktop: a clean studio source under a heavy scrim shows
  // no mush at 2.7x, and erna.is has no larger original (checked their media
  // API). Listed explicitly so it cannot hide a NEW regression.
  const ACCEPTED = new Set(['matsett.webp']);
  const realUp = up.filter((o) => !ACCEPTED.has(o.s));
  const okUp = up.filter((o) => ACCEPTED.has(o.s));
  if (realUp.length) flag(d.name, 'CSS UPSCALE', realUp.map((o) => `${o.s} @${o.u}x`).join(', '));
  if (okUp.length) console.log(`    (accepted upscale: ${okUp.map((o) => `${o.s} @${o.u}x`).join(', ')})`);

  if (errs.length) flag(d.name, 'CONSOLE', errs.slice(0, 3).join(' | '));

  console.log(`  ${d.name} (${d.w}x${d.h} @${d.dpr}x) checked`);
  await page.close();
}

await browser.close();
console.log('\n' + (issues.length ? `ISSUES (${issues.length}):\n  ` + issues.join('\n  ') : 'NO ISSUES across all widths'));
