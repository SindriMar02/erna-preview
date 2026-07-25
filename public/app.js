/* ==========================================================================
   ERNA — the four transplanted mechanisms, and nothing else.
   No framework, no smooth-scroll library. One rAF loop, one write pass.

   Motion pass 3: every scroll-driven value is CRITICALLY DAMPED toward its
   target instead of written raw. Raw scroll maps values 1:1 to wheel events,
   so motion inherits their stepping; easing each channel toward its target
   over its own time constant gives the page inertia without hijacking scroll.
   Different tau per layer is deliberate: the hero tracks tightly (.09s), media
   settles (.15s), parallax floats (.22s). The loop idle-cancels when every
   channel has converged and wakes on the next scroll (ledger #24).
   ========================================================================== */
(() => {
  'use strict';

  const doc = document;
  const body = doc.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, r = doc) => r.querySelector(s);
  const $$ = (s, r = doc) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const smooth01 = (t) => t * t * (3 - 2 * t); // smoothstep, for plate arrival

  /* ------------------------------------------------------------------ *
   * 0. The loader. Held for the aperture timeline, released on load.
   * ------------------------------------------------------------------ */
  const openAperture = () => {
    if (body.classList.contains('loaded')) return;
    body.classList.add('loaded');
    body.classList.remove('is-loading');
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
    const floor = new Promise((res) => setTimeout(res, 2000));
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
   * 1. Two-speed headline reveal. Time-based, unchanged: the cascade is
   *    the signature and it should not be scrubbed.
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

  const punchIo = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); punchIo.unobserve(e.target); }
    }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  $$('.res-punch').forEach((el) => punchIo.observe(el));

  /* ------------------------------------------------------------------ *
   * 2. The damped scroll engine.
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
  const tlEls = $$('.tl-i');
  const tlList = $('.tl');
  const hdrProg = $('.hdr-prog');
  const navLinks = $$('.hdr-nav a');
  const navTargets = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);

  const wmInner = wordmark ? wordmark.firstElementChild : null;
  const hdrName = hdr ? hdr.querySelector('.hdr-name') : null;

  /* a channel eases toward its target with its own time constant */
  const chan = (tau) => ({ cur: null, tau });
  let settled = true;
  const adv = (c, tgt, dt) => {
    if (c.cur === null) { c.cur = tgt; return tgt; }
    c.cur += (tgt - c.cur) * (1 - Math.exp(-dt / c.tau));
    if (Math.abs(tgt - c.cur) < 0.0008) c.cur = tgt;
    else settled = false;
    return c.cur;
  };

  /* Content blocks that rise as they cross the reading line. Each carries its
     index within its group as a stagger, and its own damped channel. */
  const RISE_GROUPS = [
    '.thesis .lede, .thesis .pull, .thesis-cta',
    '.divider',
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
      riseEls.push({ el, stagger: Math.min(i, 8) * 34, ch: chan(0.16), out: -1 });
    });
  });

  /* masked frames reveal AND drift, full-bleed plates only drift */
  const scrubEls = [
    ...$$('.js-rv').map((el) => ({ el, masked: true, amp: -22, chRv: chan(0.15), chPar: chan(0.22), rv: -1, par: null, r: null })),
    ...$$('.js-par').map((el) => ({ el, masked: false, amp: -34, chRv: null, chPar: chan(0.22), rv: -1, par: null, r: null })),
  ];

  stepEls.forEach((el) => { el._ch = chan(0.12); el._seg = -1; el._out = -1; });
  tlEls.forEach((el) => { el._ch = chan(0.12); el._out = -1; });
  const chMask = chan(0.09);
  const chFlight = chan(0.09);
  const chPP = chan(0.15);
  const chTP = chan(0.14);
  const chDP = chan(0.15);
  /* scroll VELOCITY, damped. Position channels answer "where"; this answers
     "how fast", and it is what gives the silver weight: frames lag a few px
     behind a hard flick and settle when the scroll stops. The idea is the
     kinetic-gallery velocity response, at a restraint fit for 1924 — a
     vertical lag, never a skew. */
  const chVel = chan(0.12);
  let prevY = scrollY;

  /* price index: hover on pointer devices, scroll-follow on touch */
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
      prList.querySelector(`[data-pr="${i}"]`)?.closest('.pr-r')?.classList.add('is-on');
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
  const touchOnly = matchMedia('(hover: none)');
  const prBtns = $$('.pr-b');
  let prScrollState = -1;

  /* geometry, measured with transforms cleared so the lerp never feeds on its
     own output. Flight scale = FONT SIZE ratio, never rect height (the rect is
     the line box, not the glyph box — rect-derived scale missed by 42.7px). */
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
        dx: to.left + to.width / 2 - (from.left + from.width / 2),
        dy: to.top + to.height / 2 - (from.top + from.height / 2),
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

  let running = false;
  let lastT = 0;
  let stepState = -1;
  let dipState = -1;
  let navState = -1;
  const hlRects = [];

  const loop = (t) => {
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    settled = true;
    const y = scrollY;
    const vh = M.vh;

    /* normalized scroll velocity in [-1, 1]; 2600 px/s maps to full weight */
    const vNorm = adv(chVel, clamp((y - prevY) / Math.max(dt, 0.004) / 2600, -1, 1), dt);
    prevY = y;

    /* --- hero pinch: one damped variable, CSS does the geometry -------- */
    if (heroMask) {
      const v = clamp(adv(chMask, clamp(y / (M.heroH * 0.92)), dt));
      doc.documentElement.style.setProperty('--mask-progress', v.toFixed(4));
    }

    /* --- wordmark flight, damped on the same clock as the pinch -------- */
    if (wmInner && M.flight) {
      const p = adv(chFlight, clamp(y / (M.heroH * 0.72)), dt);
      const e = 1 - Math.pow(1 - p, 3);
      const s = 1 + (M.flight.scale - 1) * e;
      wmInner.style.transform =
        `translate3d(${(M.flight.dx * e).toFixed(2)}px, ${(M.flight.dy * e).toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
      wordmark.style.opacity = p >= 0.999 ? '0' : '1';
      hdr.classList.toggle('is-named', p >= 0.999);
    }

    if (hdr) hdr.classList.toggle('is-down', y > M.heroH * 0.75);

    /* --- sticky mask stepper: damped, eased arrival -------------------- */
    if (stepper && stepEls.length) {
      const local = clamp((y - M.stepTop) / Math.max(1, M.stepH - vh));
      const n = stepEls.length;
      const idx = Math.min(n - 1, Math.floor(local * n + 0.0001));
      for (let i = 0; i < n; i++) {
        const raw = i === 0 ? 1 : clamp(local * n - i);
        const seg = adv(stepEls[i]._ch, smooth01(raw), dt);
        const el = stepEls[i];
        if (el._seg !== seg) { el.style.setProperty('--seg', seg.toFixed(4)); el._seg = seg; }
        if (i > 0) {
          const below = stepEls[i - 1];
          if (below._out !== seg) { below.style.setProperty('--out', seg.toFixed(4)); below._out = seg; }
        }
      }
      if (idx !== stepState) {
        stepState = idx;
        ticks.forEach((tk, i) => tk.classList.toggle('is-on', i === idx));
      }
    }

    /* --- READ every rect first, then WRITE (never interleave) ---------- */
    for (let i = 0; i < scrubEls.length; i++) scrubEls[i].r = scrubEls[i].el.getBoundingClientRect();

    for (let i = 0; i < scrubEls.length; i++) {
      const e = scrubEls[i], r = e.r;
      if (r.bottom < -vh || r.top > vh * 2) continue;
      const off = clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1);
      /* position drift plus the velocity weight: scrolling down, frames hang
         a beat low, then the .22s damping settles them into place */
      const par = adv(e.chPar, off * e.amp + vNorm * 13, dt);
      if (e.par !== par) { e.el.style.setProperty('--par', par.toFixed(2) + 'px'); e.par = par; }
      if (!e.masked) continue;
      const rv = adv(e.chRv, clamp((vh - r.top) / (r.height * 0.42 + vh * 0.1)), dt);
      if (e.rv !== rv) { e.el.style.setProperty('--rv', rv.toFixed(4)); e.rv = rv; }
    }

    /* --- content blocks rise as they cross the reading line ------------ */
    for (let i = 0; i < riseEls.length; i++) {
      const e = riseEls[i];
      const r = e.el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh * 1.25) continue;
      const ri = adv(e.ch, clamp((vh * 0.9 - r.top - e.stagger) / (vh * 0.16)), dt);
      if (e.out !== ri) { e.el.style.setProperty('--ri', ri.toFixed(3)); e.out = ri; }
    }

    /* --- the timeline: rail fills, each year ignites -------------------- */
    if (tlEls.length && tlList) {
      const lr = tlList.getBoundingClientRect();
      const line = vh * 0.62;
      const tp = adv(chTP, clamp((line - lr.top) / Math.max(1, lr.height)), dt);
      tlList.style.setProperty('--tp', tp.toFixed(4));
      for (let i = 0; i < tlEls.length; i++) {
        const el = tlEls[i];
        const r = el.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh * 1.2) continue;
        const lit = adv(el._ch, clamp((line - r.top) / 46), dt);
        if (el._out !== lit) {
          el.style.setProperty('--lit', lit.toFixed(3));
          el.classList.toggle('is-lit', lit > 0.55);
          el._out = lit;
        }
      }
    }

    /* --- page progress + scrollspy -------------------------------------- */
    if (hdrProg) {
      const max = Math.max(1, doc.documentElement.scrollHeight - vh);
      hdrProg.style.setProperty('--pp', adv(chPP, clamp(y / max), dt).toFixed(4));
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

    /* --- price panel follows scroll where there is no hover ------------- */
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

    /* --- diptych: rolling label, running index, progress rail ------------ */
    if (hlEls.length) {
      let cur = 0;
      const mid = vh * 0.5;
      for (let i = 0; i < hlEls.length; i++) {
        const r = hlRects[i] = hlEls[i].getBoundingClientRect();
        if (r.top <= mid && r.bottom >= 0) cur = i;
      }
      if (cur !== dipState) {
        dipState = cur;
        if (dipCount) dipCount.textContent = String(cur + 1).padStart(2, '0');
        for (let i = 0; i < dipNow.length; i++) {
          dipNow[i].classList.toggle('is-on', i === cur);
          dipNow[i].classList.toggle('is-past', i < cur);
        }
      }
      if (dipRail && dipScroll) {
        const r = dipScroll.getBoundingClientRect();
        const p = adv(chDP, clamp((vh * 0.5 - r.top) / Math.max(1, r.height - vh * 0.35)), dt);
        dipRail.style.setProperty('--dp', p.toFixed(4));
      }
    }

    if (!settled) requestAnimationFrame(loop);
    else running = false;
  };

  const wake = () => {
    if (running || reduced.matches) return;
    running = true;
    lastT = performance.now();
    settled = false;
    requestAnimationFrame(loop);
  };

  if (!reduced.matches) {
    addEventListener('scroll', wake, { passive: true });
    addEventListener('resize', () => { M = measure(); wake(); }, { passive: true });
    addEventListener('load', () => { M = measure(); wake(); }, { once: true });
    if (doc.fonts?.ready) doc.fonts.ready.then(() => { M = measure(); wake(); });
    if (wordmark) wordmark.style.opacity = '1';
    wake();
  }

  /* ------------------------------------------------------------------ *
   * 3. Mobile menu. Sibling of the header, never a child (ledger #29).
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
