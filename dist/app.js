/* ==========================================================================
   ERNA — the four transplanted mechanisms, and nothing else.
   No framework, no smooth-scroll library. One rAF loop, one write pass.
   ========================================================================== */
(() => {
  'use strict';

  const doc = document;
  const body = doc.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, r = doc) => r.querySelector(s);
  const $$ = (s, r = doc) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

  /* ------------------------------------------------------------------ *
   * 0. The loader. Held for the aperture timeline, released on load.
   *    Under reduced motion it never runs at all (CSS hides it).
   * ------------------------------------------------------------------ */
  const openAperture = () => {
    if (body.classList.contains('loaded')) return;
    body.classList.add('loaded');
    body.classList.remove('is-loading');
    // the plate is gone by 1.6s; drop it from the tree so nothing can trap taps
    setTimeout(() => { const l = $('#loader'); if (l) l.remove(); }, 2200);
  };

  if (reduced.matches) {
    body.classList.remove('is-loading');
    body.classList.add('loaded');
    const l = $('#loader'); if (l) l.remove();
  } else {
    const hold = new Promise((res) => {
      if (doc.readyState === 'complete') res();
      else addEventListener('load', res, { once: true });
    });
    const floor = new Promise((res) => setTimeout(res, 2000)); // let the shutter finish
    Promise.all([hold, floor]).then(openAperture);
    setTimeout(openAperture, 5200); // never strand anyone behind the plate
  }

  /* the video may be blocked by a data saver. Only hide the poster if it runs. */
  const heroV = $('#heroV');
  if (heroV) {
    const live = () => heroV.classList.add('is-live');
    if (heroV.readyState >= 2) live();
    heroV.addEventListener('playing', live, { once: true });
    const p = heroV.play?.();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  /* ------------------------------------------------------------------ *
   * 1. Two-speed headline reveal.
   *    Two-stage gate so the container fade never races the word slide.
   *    The observer sits on the heading itself, which never clips to zero
   *    (redesign-craft-ledger #7): only the inner words transform.
   * ------------------------------------------------------------------ */
  const titles = $$('.ts');
  if (titles.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          el.classList.add('is-title-visible');
          requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-title-revealed')));
          io.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 }
    );
    titles.forEach((t) => io.observe(t));
  }

  /* generic "came into view" for images, timeline, the resolving punch */
  const inView = (sel, cls = 'is-in', opts = {}) => {
    const els = $$(sel);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add(cls); io.unobserve(e.target); }
      }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12, ...opts }
    );
    els.forEach((el) => io.observe(el));
  };
  inView('.res-punch');

  /* ------------------------------------------------------------------ *
   * 2. Hero pinch, wordmark flight, header, stepper, diptych counter.
   *    All of it reads in one rAF pass and writes CSS custom properties.
   *    Nothing here runs under reduced motion.
   * ------------------------------------------------------------------ */
  const hero = $('#hero');
  const heroMask = $('#heroMask');
  const wordmark = $('#wordmark');
  const hdr = $('#hdr');
  const stepper = $('#stepper');
  const stepEls = $$('.fs');
  const ticks = $$('.pg-t');
  const dipCount = $('#dipCount');
  const hlEls = $$('.hl');
  const dipNow = $$('.dip-now-i');
  const dipRail = $('.dip-rail');
  const dipScroll = $('.dip-scroll');
  // one flat list: masked frames reveal AND drift, plates only drift
  /* Content blocks that rise as they cross the reading line. Declared here as
     selector groups so the markup stays clean; each element carries its index
     within its group, which becomes the stagger. */
  const RISE_GROUPS = [
    '.thesis .lede, .thesis .pull, .thesis-cta',
    '.step-lead',
    '.marks-lead, .marks-label',
    '.mk', '.marks-link',
    '.story-lead, .fnd', '.qt', '.ar-f',
    '.pr-eyebrow, .h-plain, .pr-lead', '.pr-r', '.pr-note',
    '.ct-lead, .ct-notice', '.ct-r', '.ct-btns, .ct-ship',
    '.ft-mark, .ft-txt, .ft-end',
  ];
  const riseEls = [];
  RISE_GROUPS.forEach((sel) => {
    $$(sel).forEach((el, i) => {
      el.setAttribute('data-rise', '');
      riseEls.push({ el, stagger: Math.min(i, 8) * 34, ri: -1 });
    });
  });

  const tlEls = $$('.tl-i');
  const tlRail = $('.tl-rail-f');
  const tlList = $('.tl');
  const hdrProg = $('.hdr-prog');
  const navLinks = $$('.hdr-nav a');
  const navTargets = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  let navState = -1;

  const scrubEls = [
    ...$$('.js-rv').map((el) => ({ el, masked: true, amp: -22, rv: -1, par: null, r: null })),
    ...$$('.js-par').map((el) => ({ el, masked: false, amp: -34, rv: -1, par: null, r: null })),
  ];

  let lastY = -1;
  let ticking = false;
  let stepState = -1;
  let dipState = -1;
  const hlRects = [];

  const wmInner = wordmark ? wordmark.firstElementChild : null;
  const hdrName = hdr ? hdr.querySelector('.hdr-name') : null;

  /* Geometry is measured with every transform cleared, so the numbers are the
     resting layout and the lerp can never feed on its own output.

     The scale comes from the FONT SIZE ratio, never from bounding-rect heights.
     A rect's height is the line box, not the glyph box, so height-derived scale
     overshot the landing width by 42.7px. Both renderings now share line-height
     and tracking, so font-size ratio makes the landing exact. */
  const measure = () => {
    let flight = null;
    if (wmInner && hdrName) {
      wmInner.style.transform = 'none';
      const from = wmInner.getBoundingClientRect();
      const to = hdrName.getBoundingClientRect();
      const scale =
        parseFloat(getComputedStyle(hdrName).fontSize) /
        parseFloat(getComputedStyle(wmInner).fontSize);
      flight = {
        scale,
        // transform-origin is the centre, so match centre to centre
        dx: to.left + to.width / 2 - (from.left + from.width / 2),
        dy: to.top + to.height / 2 - (from.top + from.height / 2),
        // kept for the QA probe: how far off the landing width is, in px
        widthErr: from.width * scale - to.width,
      };
    }
    return {
      vh: innerHeight,
      heroH: hero ? hero.offsetHeight : innerHeight,
      stepTop: stepper ? stepper.getBoundingClientRect().top + scrollY : 0,
      stepH: stepper ? stepper.offsetHeight : 0,
      flight,
    };
  };
  let M = measure();

  const frame = () => {
    ticking = false;
    const y = scrollY;
    if (y === lastY) return;

    /* --- the pinch: one variable, CSS does the geometry --------------- */
    if (heroMask) {
      const p = clamp(y / (M.heroH * 0.92));
      doc.documentElement.style.setProperty('--mask-progress', p.toFixed(4));
    }

    /* --- the wordmark flies hero-centre to header -------------------- */
    if (wmInner && M.flight) {
      const p = clamp(y / (M.heroH * 0.72));
      const e = 1 - Math.pow(1 - p, 3); // out-cubic, matched to --ease-out-cubic
      const s = 1 + (M.flight.scale - 1) * e;
      wmInner.style.transform =
        `translate3d(${(M.flight.dx * e).toFixed(2)}px, ${(M.flight.dy * e).toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
      wordmark.style.opacity = p >= 0.999 ? '0' : '1';
      hdr.classList.toggle('is-named', p >= 0.999);
    }

    /* --- header: clip-path slide-down once the hero is mostly past ---- */
    if (hdr) hdr.classList.toggle('is-down', y > M.heroH * 0.75);

    /* --- the sticky mask stepper ------------------------------------- */
    if (stepper && stepEls.length) {
      const local = clamp((y - M.stepTop) / Math.max(1, M.stepH - M.vh));
      const n = stepEls.length;
      const idx = Math.min(n - 1, Math.floor(local * n + 0.0001));
      stepEls.forEach((el, i) => {
        // successive media are revealed BY MASK, not by fade
        const seg = clamp(local * n - i);
        el.style.clipPath = i === 0 ? 'inset(0 0 0 0)' : `inset(${((1 - seg) * 100).toFixed(2)}% 0 0 0)`;
      });
      if (idx !== stepState) {
        stepState = idx;
        ticks.forEach((t, i) => t.classList.toggle('is-on', i === idx));
      }
    }

    /* --- scrubbed feathered reveal + parallax on every media frame ----
       Each frame's own rect drives it, so a deep link or a resize lands on
       the correct state instead of replaying an entrance from nothing. */
    /* Every rect is READ first, then every custom property is WRITTEN.
       Interleaving them makes each write invalidate style so the next read
       forces a fresh layout, once per element per frame. */
    const vh = M.vh;
    for (let i = 0; i < scrubEls.length; i++) {
      const e = scrubEls[i];
      e.r = e.el.getBoundingClientRect();
    }
    for (let i = 0; i < scrubEls.length; i++) {
      const e = scrubEls[i], r = e.r;
      if (r.bottom < -vh || r.top > vh * 2) continue;
      const off = clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1);
      const par = off * e.amp;
      if (e.par !== par) { e.el.style.setProperty('--par', par.toFixed(1) + 'px'); e.par = par; }
      if (!e.masked) continue;
      // fully open by the time the frame's top is two thirds up the viewport;
      // any later and a large frame reads as an empty box while you scroll at it
      const rv = clamp((vh - r.top) / (r.height * 0.42 + vh * 0.1));
      if (e.rv !== rv) { e.el.style.setProperty('--rv', rv.toFixed(4)); e.rv = rv; }
    }

    /* --- content blocks rise as they cross the reading line ----------- */
    for (let i = 0; i < riseEls.length; i++) {
      const e = riseEls[i];
      const r = e.el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh * 1.25) continue;
      const ri = clamp((vh * 0.9 - r.top - e.stagger) / (vh * 0.16));
      if (e.ri !== ri) { e.el.style.setProperty('--ri', ri.toFixed(3)); e.ri = ri; }
    }

    /* --- the timeline: rail fills, each year ignites as it crosses ---- */
    if (tlEls.length && tlList) {
      const lr = tlList.getBoundingClientRect();
      const line = vh * 0.62;
      const tp = clamp((line - lr.top) / Math.max(1, lr.height));
      if (tlRail) tlRail.parentElement.style.setProperty('--tp', tp.toFixed(4));
      for (let i = 0; i < tlEls.length; i++) {
        const el = tlEls[i];
        const r = el.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh * 1.2) continue;
        const lit = clamp((line - r.top) / 46);
        if (el._lit !== lit) {
          el.style.setProperty('--lit', lit.toFixed(3));
          el.classList.toggle('is-lit', lit > 0.55);
          el._lit = lit;
        }
      }
    }

    /* --- page progress + scrollspy ------------------------------------ */
    if (hdrProg) {
      const max = Math.max(1, doc.documentElement.scrollHeight - vh);
      hdrProg.style.setProperty('--pp', clamp(y / max).toFixed(4));
    }
    if (navTargets.length) {
      let cur = -1;
      for (let i = 0; i < navTargets.length; i++) {
        if (navTargets[i].getBoundingClientRect().top <= vh * 0.34) cur = i;
      }
      if (cur !== navState) {
        navState = cur;
        for (let i = 0; i < navLinks.length; i++) navLinks[i].classList.toggle('is-current', i === cur);
      }
    }

    /* --- price panel follows scroll where there is no hover ----------- */
    if (showPrice && touchOnly.matches && prBtns.length) {
      const line = vh * 0.42;
      let best = -1, bestD = Infinity;
      for (let i = 0; i < prBtns.length; i++) {
        const r = prBtns[i].getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        const d = Math.abs(r.top + r.height / 2 - line);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best >= 0 && best !== prScrollState) {
        prScrollState = best;
        showPrice(Number(prBtns[best].dataset.pr));
      }
    }

    /* --- diptych: rolling label, running index, progress rail --------- */
    if (hlEls.length) {
      let cur = 0;
      const mid = M.vh * 0.5;
      for (let i = 0; i < hlEls.length; i++) {
        const r = hlRects[i] = hlEls[i].getBoundingClientRect();
        if (r.top <= mid && r.bottom >= 0) cur = i;
      }
      if (cur !== dipState) {
        dipState = cur;
        if (dipCount) dipCount.textContent = String(cur + 1).padStart(2, '0');
        // enter from below, leave upward: one rolling label, not a crossfade
        for (let i = 0; i < dipNow.length; i++) {
          dipNow[i].classList.toggle('is-on', i === cur);
          dipNow[i].classList.toggle('is-past', i < cur);
        }
      }
      if (dipRail && dipScroll) {
        const r = dipScroll.getBoundingClientRect();
        const p = clamp((M.vh * 0.5 - r.top) / Math.max(1, r.height - M.vh * 0.35));
        dipRail.style.setProperty('--dp', p.toFixed(4));
      }
    }

    lastY = y;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  };

  if (!reduced.matches) {
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => { M = measure(); lastY = -1; onScroll(); }, { passive: true });
    addEventListener('load', () => { M = measure(); lastY = -1; onScroll(); }, { once: true });
    // webfont swap changes the wordmark's box, so the flight has to be re-measured
    if (doc.fonts?.ready) doc.fonts.ready.then(() => { M = measure(); lastY = -1; onScroll(); });
    if (wordmark) wordmark.style.opacity = '1';
    onScroll();
  }

  /* ------------------------------------------------------------------ *
   * 3. The price index. Rows drive one image panel.
   *    Pointer, keyboard focus and click all move it, so it is usable
   *    without a mouse and announced through aria-describedby.
   * ------------------------------------------------------------------ */
  const prList = $('#prList');
  const prImgs = $$('.pr-img');
  let showPrice = null;
  if (prList && prImgs.length) {
    let prCur = 0;
    const show = (i) => {
      if (i === prCur || !prImgs[i]) return;
      prImgs[prCur]?.classList.remove('is-on');
      prImgs[i].classList.add('is-on');
      $$('.pr-r', prList).forEach((r) => r.classList.remove('is-on'));
      prImgs[i].closest('.pr-panel');
      const btn = prList.querySelector(`[data-pr="${i}"]`);
      btn?.closest('.pr-r')?.classList.add('is-on');
      prCur = i;
    };
    $$('.pr-b', prList).forEach((b) => {
      const i = Number(b.dataset.pr);
      b.addEventListener('pointerenter', () => show(i));
      b.addEventListener('focus', () => show(i));
      b.addEventListener('click', () => show(i));
    });
    prList.querySelector('[data-pr="0"]')?.closest('.pr-r')?.classList.add('is-on');
    showPrice = show;
  }

  /* On a touch device there is no hover, so the panel would never move off the
     first item. Drive it from scroll position instead: whichever row is nearest
     the reading line wins. Pointer devices keep the hover behaviour. */
  const touchOnly = matchMedia('(hover: none)');
  const prBtns = $$('.pr-b');
  let prScrollState = -1;

  /* ------------------------------------------------------------------ *
   * 4. Mobile menu. Sibling of the header, never a child.
   * ------------------------------------------------------------------ */
  const burger = $('#burger');
  const menu = $('#menu');
  if (burger && menu) {
    let open = false;
    const set = (v) => {
      open = v;
      burger.setAttribute('aria-expanded', String(v));
      menu.classList.toggle('is-open', v);
      body.classList.toggle('is-menu', v);
      if (v) { menu.hidden = false; }
      else { setTimeout(() => { if (!open) menu.hidden = true; }, 420); }
    };
    burger.addEventListener('click', () => set(!open));
    menu.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      set(false);
      const id = a.getAttribute('href');
      e.preventDefault();
      requestAnimationFrame(() => {
        $(id)?.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      });
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { set(false); burger.focus(); } });
  }
})();
