import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:8791';
const OUT = 'qa-shots';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  userDataDir: '/private/tmp/claude-501/-Users-sindri-Documents-Website-redesign-mockups/3b1f3e1c-861e-4803-a898-6759669caedf/scratchpad/chrome-erna',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--force-color-profile=srgb'],
});

const report = { errors: [], checks: [] };
const ok = (n, pass, extra = '') => report.checks.push(`${pass ? 'PASS' : 'FAIL'}  ${n}${extra ? '  ' + extra : ''}`);

const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') report.errors.push(m.text()); });
page.on('pageerror', (e) => report.errors.push('PAGEERROR ' + e.message));
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 45000 });

/* ---------- the aperture ---------- */
await sleep(700);
await page.screenshot({ path: `${OUT}/01-loader-mid.png` });
const holeMid = await page.evaluate(() => {
  const p = document.querySelector('.loader-plate');
  if (!p) return null;
  return getComputedStyle(p).maskSize || getComputedStyle(p).webkitMaskSize;
});
ok('aperture is open mid-animation', !!holeMid && !/(^|,\s*)0px 0px/.test(holeMid), String(holeMid));

await page.waitForFunction(() => document.body.classList.contains('loaded'), { timeout: 12000 });
await sleep(2600);
const loaderGone = await page.evaluate(() => !document.querySelector('#loader'));
ok('loader removed from tree after open', loaderGone);
await page.screenshot({ path: `${OUT}/02-hero.png` });

/* ---------- headline: two-speed reveal actually fires ---------- */
const ts = await page.evaluate(() => {
  const t = document.querySelector('.thesis .ts');
  if (!t) return null;
  const caps = t.querySelector('.tw--caps .tw-i');
  const ital = t.querySelector('.tw--ital .tw-i');
  return {
    beforeCaps: getComputedStyle(caps).transform,
    beforeItal: getComputedStyle(ital).opacity,
    revealed: t.classList.contains('is-title-revealed'),
  };
});
ok('thesis headline hidden before scroll', ts && !ts.revealed && ts.beforeCaps !== 'none', JSON.stringify(ts));

await page.evaluate(() => document.querySelector('#thesis').scrollIntoView({ block: 'center' }));
await sleep(2400);
const tsAfter = await page.evaluate(() => {
  const t = document.querySelector('.thesis .ts');
  const caps = t.querySelector('.tw--caps .tw-i');
  const ital = t.querySelector('.tw--ital .tw-i');
  return {
    caps: getComputedStyle(caps).transform,
    ital: getComputedStyle(ital).opacity,
    revealed: t.classList.contains('is-title-revealed'),
    label: t.getAttribute('aria-label'),
    text: t.textContent.replace(/\s+/g, ' ').trim(),
  };
});
ok('two-speed reveal fires', tsAfter.revealed && (tsAfter.caps === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(tsAfter.caps)) && Number(tsAfter.ital) > 0.98, JSON.stringify(tsAfter).slice(0, 200));
ok('headline accessible name is clean', tsAfter.label === tsAfter.text, `label="${tsAfter.label}" text="${tsAfter.text}"`);
await page.screenshot({ path: `${OUT}/03-thesis.png` });

/* ---------- hero pinch: --mask-progress must actually move ---------- */
await page.evaluate(() => scrollTo(0, 0));
await sleep(500);
const p0 = await page.evaluate(() => ({
  v: getComputedStyle(document.documentElement).getPropertyValue('--mask-progress').trim(),
  clip: getComputedStyle(document.querySelector('#heroMask')).clipPath,
}));
await page.evaluate(() => scrollTo(0, innerHeight * 0.55));
await sleep(500);
const p1 = await page.evaluate(() => ({
  v: getComputedStyle(document.documentElement).getPropertyValue('--mask-progress').trim(),
  clip: getComputedStyle(document.querySelector('#heroMask')).clipPath,
}));
ok('hero pinch drives --mask-progress', Number(p1.v) > Number(p0.v || 0) + 0.3, `${p0.v} -> ${p1.v}`);
ok('hero clip-path changes with it', p0.clip !== p1.clip, `${p0.clip.slice(0, 60)} -> ${p1.clip.slice(0, 60)}`);

/* ---------- wordmark flight ---------- */
const w0 = await page.evaluate(() => { scrollTo(0, 0); return null; });
await sleep(400);
const wA = await page.evaluate(() => document.querySelector('#wordmark span').getBoundingClientRect().top);
await page.evaluate(() => scrollTo(0, innerHeight * 0.8));
await sleep(600);
const wB = await page.evaluate(() => ({
  top: document.querySelector('#wordmark span').getBoundingClientRect().top,
  named: document.querySelector('#hdr').classList.contains('is-named'),
  hdrDown: document.querySelector('#hdr').classList.contains('is-down'),
}));
ok('wordmark flies toward header', Math.abs(wA - wB.top) > 150, `${Math.round(wA)} -> ${Math.round(wB.top)}`);
ok('header slides down past hero', wB.hdrDown);
void w0;

/* ---------- sticky mask stepper: prove sideways/vertical travel ---------- */
const stepTop = await page.evaluate(() => {
  const s = document.querySelector('#stepper');
  return s.getBoundingClientRect().top + scrollY;
});
const stepH = await page.evaluate(() => document.querySelector('#stepper').offsetHeight);
const readStep = () => page.evaluate(() => ({
  clips: Array.from(document.querySelectorAll('.fs')).map((e) => e.style.getPropertyValue('--seg')),
  on: Array.from(document.querySelectorAll('.pg-t')).findIndex((e) => e.classList.contains('is-on')),
  word: Array.from(document.querySelectorAll('.fs')).map((e, i) => ({
    i, vis: e.getBoundingClientRect().height > 0,
  })).length,
}));
const depths = [0.08, 0.42, 0.85];
const stepReads = [];
for (const d of depths) {
  await page.evaluate((y) => scrollTo(0, y), stepTop + (stepH - 900) * d);
  await sleep(500);
  stepReads.push(await readStep());
}
ok('stepper advances through 3 steps',
  stepReads[0].on === 0 && stepReads[1].on === 1 && stepReads[2].on === 2,
  JSON.stringify(stepReads.map((r) => r.on)));
ok('stepper reveals by mask, plate coverage advances',
  stepReads[0].clips[1] !== stepReads[2].clips[1],
  `${stepReads[0].clips[1]} -> ${stepReads[2].clips[1]}`);
await page.screenshot({ path: `${OUT}/04-stepper.png` });

/* ---------- wordmark landing must be pixel exact ---------- */
const landing = await page.evaluate(() => {
  const wm = document.querySelector('#wordmark span');
  const hn = document.querySelector('.hdr-name');
  const prev = wm.style.transform;
  wm.style.transform = 'none';
  const a = wm.getBoundingClientRect(), b = hn.getBoundingClientRect();
  const s = parseFloat(getComputedStyle(hn).fontSize) / parseFloat(getComputedStyle(wm).fontSize);
  wm.style.transform = `translate3d(${b.left + b.width/2 - (a.left + a.width/2)}px, ${b.top + b.height/2 - (a.top + a.height/2)}px, 0) scale(${s})`;
  const l = wm.getBoundingClientRect();
  wm.style.transform = prev;
  return { dl: l.left - b.left, dt: l.top - b.top, dw: l.width - b.width, dh: l.height - b.height };
});
const worstEdge = Math.max(...Object.values(landing).map(Math.abs));
ok('wordmark lands on the header mark within 1px', worstEdge < 1,
   `worst edge ${worstEdge.toFixed(2)}px  ${JSON.stringify(Object.fromEntries(Object.entries(landing).map(([k,v])=>[k,+v.toFixed(2)])))}`);

/* ---------- feathered reveal is scrubbed, not one-shot ----------
   A CSS transition also shows intermediates, so that proves nothing. The
   property that separates scrubbed from triggered is REVERSIBILITY: scroll
   back up and a scrubbed value falls again, a one-shot reveal stays at 1. */
await page.evaluate(() => document.querySelector('#gengur-a-milli').scrollIntoView({ block: 'start' }));
await sleep(500);
const readRv = () => page.evaluate(() =>
  Array.from(document.querySelectorAll('.hl-media')).map(e => parseFloat(getComputedStyle(e).getPropertyValue('--rv'))));

// sweep down in small steps and find a frame caught mid-reveal
let midHit = null;
for (let i = 0; i < 14 && !midHit; i++) {
  await page.evaluate(() => scrollBy(0, 120));
  await sleep(140);
  const rv = await readRv();
  const k = rv.findIndex(v => v > 0.08 && v < 0.92);
  if (k >= 0) midHit = { k, v: rv[k], y: await page.evaluate(() => scrollY) };
}
ok('reveal passes through intermediate states', !!midHit, midHit ? `frame ${midHit.k} at --rv=${midHit.v.toFixed(3)}` : 'never caught mid-reveal');

let reversible = false, detail = 'no mid-reveal frame to test';
if (midHit) {
  await page.evaluate(() => scrollBy(0, 260));
  await sleep(550);
  const fwd = (await readRv())[midHit.k];
  await page.evaluate(() => scrollBy(0, -260));
  await sleep(550);
  const back = (await readRv())[midHit.k];
  reversible = fwd > midHit.v + 0.02 && Math.abs(back - midHit.v) < 0.05;
  detail = `${midHit.v.toFixed(3)} -> ${fwd.toFixed(3)} -> ${back.toFixed(3)} on scroll back`;
}
ok('reveal is scrubbed by scroll, not one-shot', reversible, detail);

/* ---------- the rolling label swaps with the scroll position ---------- */
const rollA = await page.evaluate(() => document.querySelector('.dip-now-i.is-on')?.dataset.di);
await page.evaluate(() => document.querySelector('#jolaskeidin').scrollIntoView({ block: 'center' }));
await sleep(900);
const rollB = await page.evaluate(() => ({
  on: document.querySelector('.dip-now-i.is-on')?.dataset.di,
  past: document.querySelectorAll('.dip-now-i.is-past').length,
  count: document.querySelector('#dipCount')?.textContent,
  rail: getComputedStyle(document.querySelector('.dip-rail')).getPropertyValue('--dp'),
}));
ok('sticky rolling label follows the objects', rollA !== rollB.on && rollB.past > 0,
   `${rollA} -> ${rollB.on}, past=${rollB.past}, count=${rollB.count}, rail=${rollB.rail}`);

/* ---------- price index interaction ---------- */
await page.evaluate(() => document.querySelector('#verdskra').scrollIntoView({ block: 'start' }));
await sleep(700);
const prBefore = await page.evaluate(() => document.querySelector('.pr-img.is-on')?.dataset.pri);
await page.evaluate(() => document.querySelector('[data-pr="6"]').dispatchEvent(new PointerEvent('pointerenter', { bubbles: true })));
await sleep(700);
const prAfter = await page.evaluate(() => document.querySelector('.pr-img.is-on')?.dataset.pri);
ok('price index swaps the panel', prBefore !== prAfter, `${prBefore} -> ${prAfter}`);
await page.screenshot({ path: `${OUT}/05-prices.png` });

/* ---------- the timeline is the earned instrument: rail + ignition ---------- */
const tlTop = await page.evaluate(() => document.querySelector('.tl').getBoundingClientRect().top + scrollY);
const tlH = await page.evaluate(() => document.querySelector('.tl').offsetHeight);
const readTl = () => page.evaluate(() => ({
  tp: parseFloat(getComputedStyle(document.querySelector('.tl-rail')).getPropertyValue('--tp') || 0),
  fill: parseFloat(getComputedStyle(document.querySelector('.tl-rail-f')).height),
  lit: document.querySelectorAll('.tl-i.is-lit').length,
}));
const tlReads = [];
for (const f of [0, 0.4, 0.9]) {
  await page.evaluate((y) => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, y); },
    Math.max(0, Math.round(tlTop - 900 * 0.62 + tlH * f)));
  await sleep(600);
  tlReads.push(await readTl());
}
ok('timeline rail fills with scroll',
  tlReads[0].tp < tlReads[1].tp && tlReads[1].tp < tlReads[2].tp && tlReads[2].fill > tlReads[0].fill + 40,
  JSON.stringify(tlReads.map((r) => ({ tp: +r.tp.toFixed(3), fill: Math.round(r.fill) }))));
ok('timeline years ignite one by one',
  tlReads[0].lit < tlReads[1].lit && tlReads[1].lit < tlReads[2].lit,
  JSON.stringify(tlReads.map((r) => r.lit)));

/* ---------- content blocks rise, and the rise is reversible ---------- */
await page.evaluate(() => document.querySelector('#hafa-samband').scrollIntoView({ block: 'start' }));
await sleep(700);
const riseA = await page.evaluate(() => Array.from(document.querySelectorAll('.ct-r')).map((e) => parseFloat(getComputedStyle(e).getPropertyValue('--ri') || 0)));
const staggered = riseA.some((v) => v > 0.02 && v < 0.98);
await page.evaluate(() => scrollBy(0, -300));
await sleep(700);
const riseB = await page.evaluate(() => Array.from(document.querySelectorAll('.ct-r')).map((e) => parseFloat(getComputedStyle(e).getPropertyValue('--ri') || 0)));
ok('content rise is staggered and scrubbed',
  staggered && riseB.some((v, i) => v < riseA[i] - 0.02),
  `A=${JSON.stringify(riseA.map((v) => +v.toFixed(2)))} B=${JSON.stringify(riseB.map((v) => +v.toFixed(2)))}`);

/* ---------- scrollspy + page progress ---------- */
const spy = [];
for (const id of ['#gengur-a-milli', '#sagan', '#hafa-samband']) {
  await page.evaluate((s) => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector(s).scrollIntoView({ block: 'start' }); }, id);
  await sleep(600);
  spy.push(await page.evaluate(() => ({
    cur: Array.from(document.querySelectorAll('.hdr-nav a')).findIndex((a) => a.classList.contains('is-current')),
    pp: parseFloat(getComputedStyle(document.querySelector('.hdr-prog')).getPropertyValue('--pp') || 0),
  })));
}
ok('scrollspy tracks the section you are in',
  spy[0].cur === 0 && spy[1].cur === 3 && spy[2].cur === 4,
  JSON.stringify(spy.map((s) => s.cur)));
ok('page progress advances monotonically',
  spy[0].pp < spy[1].pp && spy[1].pp < spy[2].pp,
  JSON.stringify(spy.map((s) => +s.pp.toFixed(3))));

/* ---------- images all loaded ---------- */
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 45)); }
  const all = Array.from(document.images);
  all.forEach((i) => { i.loading = 'eager'; });
  await Promise.allSettled(all.map((i) => i.decode()));
});
await sleep(800);
const imgs = await page.evaluate(() =>
  Array.from(document.images).map((i) => ({ src: i.currentSrc.split('/').pop(), w: i.naturalWidth, alt: i.alt, box: Math.round(i.getBoundingClientRect().width) })));
const broken = imgs.filter((i) => i.w === 0);
const noAlt = imgs.filter((i) => !i.alt || !i.alt.trim());
ok('every image loaded', broken.length === 0, broken.map((b) => b.src).join(', '));
ok('every image has alt text', noAlt.length === 0, noAlt.map((b) => b.src).join(', '));

/* ---------- overflow + tap targets ---------- */
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok('no horizontal overflow at 1440', overflow <= 0, String(overflow));

/* ---------- full page shot ---------- */
await page.evaluate(() => scrollTo(0, 0));
await sleep(600);
await page.screenshot({ path: `${OUT}/06-full.png`, fullPage: true });

/* ---------- mobile ---------- */
const m = await browser.newPage();
m.on('pageerror', (e) => report.errors.push('MOBILE PAGEERROR ' + e.message));
await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto(BASE + '/', { waitUntil: 'networkidle0' });
await m.waitForFunction(() => document.body.classList.contains('loaded'), { timeout: 12000 });
await sleep(2200);
const mOverflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok('no horizontal overflow at 390', mOverflow <= 0, String(mOverflow));
const burgerHit = await m.evaluate(() => {
  const b = document.querySelector('#burger');
  const r = b.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top),
    hit: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('#burger') ? 'burger' : 'blocked' };
});
ok('burger is reachable at the top of the page', burgerHit.hit === 'burger' && burgerHit.top >= 0, JSON.stringify(burgerHit));
await m.screenshot({ path: `${OUT}/07-mobile-hero.png` });
await m.click('#burger');
await sleep(800);
const menuOpen = await m.evaluate(() => {
  const el = document.querySelector('#menu');
  const a = el.querySelector('a');
  return { open: el.classList.contains('is-open'), y: Math.round(a.getBoundingClientRect().top), t: getComputedStyle(a).transform };
});
ok('mobile menu opens and links rise', menuOpen.open && menuOpen.y > 0, JSON.stringify(menuOpen));
await m.screenshot({ path: `${OUT}/08-mobile-menu.png` });
await m.evaluate(() => document.querySelector('#burger').click());
await sleep(600);
await m.evaluate(() => document.querySelector('#gengur-a-milli').scrollIntoView());
await sleep(1200);
await m.screenshot({ path: `${OUT}/09-mobile-dip.png` });

/* ---------- price panel follows scroll on touch (no hover exists) ---------- */
const tp2 = await browser.newPage();
await tp2.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
// puppeteer's emulateMediaFeatures rejects `hover`, so go through CDP
const tpClient = await tp2.createCDPSession();
await tpClient.send('Emulation.setEmulatedMedia', {
  features: [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }],
});
await tp2.goto(BASE + '/', { waitUntil: 'networkidle0' });
await tp2.waitForFunction(() => document.body.classList.contains('loaded'), { timeout: 12000 });
await sleep(1500);
await tp2.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector('#verdskra').scrollIntoView({ block: 'start' }); });
await sleep(600);
const tA = await tp2.evaluate(() => document.querySelector('.pr-img.is-on')?.dataset.pri);
await tp2.evaluate(() => scrollBy(0, 900));
await sleep(700);
const tB = await tp2.evaluate(() => document.querySelector('.pr-img.is-on')?.dataset.pri);
ok('price panel follows scroll where there is no hover', tA !== tB, `${tA} -> ${tB}`);
await tp2.close();

/* ---------- reduced motion: everything visible, nothing gated ---------- */
const r = await browser.newPage();
r.on('pageerror', (e) => report.errors.push('RM PAGEERROR ' + e.message));
await r.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await r.setViewport({ width: 1440, height: 900 });
await r.goto(BASE + '/', { waitUntil: 'networkidle0' });
await sleep(1200);
const rm = await r.evaluate(() => {
  const hidden = [];
  document.querySelectorAll('.ts, .hl-img, .tl-i, .res-mark, .hero-h1-sub').forEach((e) => {
    const s = getComputedStyle(e);
    if (Number(s.opacity) < 0.9) hidden.push(e.className + ' op=' + s.opacity);
    if (s.clipPath && s.clipPath !== 'none' && /100%/.test(s.clipPath)) hidden.push(e.className + ' clip=' + s.clipPath);
  });
  // the feathered reveal hides media by mask, so --rv must resolve open
  document.querySelectorAll('.js-rv').forEach((e) => {
    const rv = parseFloat(getComputedStyle(e).getPropertyValue('--rv'));
    if (!(rv >= 0.99)) hidden.push('js-rv --rv=' + rv);
  });
  return { hidden, loader: !!document.querySelector('#loader'), bodyOverflow: getComputedStyle(document.body).overflow };
});
ok('reduced motion renders everything visible', rm.hidden.length === 0, rm.hidden.join(' | '));
ok('reduced motion kills the loader', !rm.loader);
await r.screenshot({ path: `${OUT}/10-reduced-motion.png`, fullPage: true });

/* ---------- no-JS: the loader must not trap anyone ---------- */
const nj = await browser.newPage();
await nj.setJavaScriptEnabled(false);
await nj.setViewport({ width: 1440, height: 900 });
await nj.goto(BASE + '/', { waitUntil: 'networkidle0' });
await sleep(800);
const njState = await nj.evaluate(() => {
  const l = document.querySelector('#loader');
  return { loaderPresent: !!l, loaderDisplay: l ? getComputedStyle(l).display : 'gone', bodyOverflow: getComputedStyle(document.body).overflow };
});
ok('no-JS: loader never traps the page', njState.loaderDisplay === 'none' && njState.bodyOverflow !== 'hidden', JSON.stringify(njState));
await nj.screenshot({ path: `${OUT}/11-nojs.png` });

/* ---------- english page ---------- */
const en = await browser.newPage();
en.on('pageerror', (e) => report.errors.push('EN PAGEERROR ' + e.message));
await en.setViewport({ width: 1440, height: 900 });
await en.goto(BASE + '/en/', { waitUntil: 'networkidle0' });
await en.waitForFunction(() => document.body.classList.contains('loaded'), { timeout: 12000 });
await sleep(1800);
// Below-fold images are lazy. Scrolling and hoping is a timing race
// (ledger #36b), so force them eager and await decode before measuring.
await en.evaluate(async () => {
  const all = Array.from(document.images);
  all.forEach((i) => { i.loading = 'eager'; });
  await Promise.allSettled(all.map((i) => i.decode()));
});
const enMeta = await en.evaluate(() => ({
  lang: document.documentElement.lang,
  h1: document.querySelectorAll('h1').length,
  title: document.title,
  imgs: Array.from(document.images).filter((i) => i.naturalWidth === 0).length,
  hreflang: Array.from(document.querySelectorAll('link[hreflang]')).map((l) => l.hreflang + '=' + l.getAttribute('href')),
}));
ok('en page: lang, single h1, images', enMeta.lang === 'en' && enMeta.h1 === 1 && enMeta.imgs === 0, JSON.stringify(enMeta).slice(0, 240));
await en.screenshot({ path: `${OUT}/12-en.png` });
void njState;

console.log('\n' + report.checks.join('\n'));
console.log('\nCONSOLE ERRORS: ' + (report.errors.length ? '\n  ' + report.errors.join('\n  ') : 'none'));
await browser.close();
