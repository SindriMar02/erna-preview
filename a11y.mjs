import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',userDataDir:'/private/tmp/claude-501/-Users-sindri-Documents-Website-redesign-mockups/3b1f3e1c-861e-4803-a898-6759669caedf/scratchpad/chrome-erna4',args:['--no-sandbox','--force-color-profile=srgb']});
const p=await b.newPage(); await p.setViewport({width:1440,height:900});
await p.goto('http://localhost:8791/',{waitUntil:'networkidle0'});
await p.waitForFunction(()=>document.body.classList.contains('loaded'),{timeout:12000});
await p.evaluate(()=>{const v=document.querySelector('#heroV'); if(v){v.pause();v.currentTime=1.2;}});
await sleep(400);
await p.evaluate(async()=>{const a=[...document.images];a.forEach(i=>i.loading='eager');await Promise.allSettled(a.map(i=>i.decode()));
  document.querySelectorAll('.ts').forEach(e=>e.classList.add('is-title-visible','is-title-revealed'));
  document.querySelectorAll('.hl,.tl,.res-punch').forEach(e=>e.classList.add('is-in'));});
await new Promise(r=>setTimeout(r,1200));

const audit = () => p.evaluate(()=>{
  // parse rgb(), rgba() and color(srgb r g b / a) into 0-255 + alpha
  const col=(s)=>{
    let m=s.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);
    if(m) return {c:[+m[1]*255,+m[2]*255,+m[3]*255], a:m[4]===undefined?1:+m[4]};
    m=s.match(/rgba?\(([^)]+)\)/); if(!m) return null;
    const v=m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return {c:v.slice(0,3), a:v.length>3?v[3]:1};
  };
  const over=(fg,bg)=>fg.c.map((v,i)=>v*fg.a+bg[i]*(1-fg.a));
  const lum=(c)=>{const [r,g,bl]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*bl};
  // A fixed element, or anything inside the hero, sits on whatever is painted
  // behind it. The cascade cannot answer that, so those go to a pixel read.
  const bgOf=(el)=>{let n=el;
    while(n&&n!==document.documentElement){const s=getComputedStyle(n);const c=col(s.backgroundColor);
      // an element's OWN opaque background wins over any positioning rule
      if(c&&c.a>0.55) return {c:c.c, opaque:true};
      if(s.position==='fixed') return {c:null, opaque:false};
      if(n.tagName==='SECTION'&&n.classList.contains('hero')) return {c:null, opaque:false};
      n=n.parentElement;}
    return {c:[211,212,211], opaque:true}};
  const rows=[];
  document.querySelectorAll('p,h1,h2,h3,a,li,dt,dd,span,button,figcaption').forEach(el=>{
    if(!el.textContent.trim())return; if(el.children.length && !/^(A|BUTTON|SPAN|DT|DD)$/.test(el.tagName))return;
    const s=getComputedStyle(el);
    if(s.visibility==='hidden'||s.display==='none')return;
    // opacity composites down the tree: a parent at 0 hides the child too, so
    // checking the element's own opacity alone reports invisible text
    let effOp=1, anc=el;
    while(anc && anc!==document.documentElement){ effOp*=Number(getComputedStyle(anc).opacity); anc=anc.parentElement; }
    if(effOp<0.35)return;
    const r=el.getBoundingClientRect(); if(r.width<2||r.height<2)return;
    // anything parked outside the viewport by a transform is not on the page
    if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return;
    const fg=col(s.color); if(!fg||fg.a===0)return;
    const size=parseFloat(s.fontSize), bold=parseInt(s.fontWeight)>=700;
    const need=(size>=24||(size>=18.66&&bold))?3:4.5;
    const bg=bgOf(el);
    const label={t:el.textContent.trim().slice(0,32),cls:(el.className||'').toString().slice(0,24)||el.tagName.toLowerCase(),size:Math.round(size),need};
    if(!bg.opaque){ rows.push({...label, mode:'PIXEL', x:Math.round(r.left+r.width/2), y:Math.round(r.top+Math.min(r.height/2,20)), fg:fg.c, fga:fg.a}); return; }
    const eff=over(fg,bg.c), L1=lum(eff), L2=lum(bg.c);
    const ratio=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
    if(ratio<need) rows.push({...label, mode:'CSS', ratio:Math.round(ratio*100)/100});
  });
  const tap=[]; document.querySelectorAll('a[href],button').forEach(el=>{const r=el.getBoundingClientRect();
    if(r.width<1)return; if(r.height<24||r.width<24) tap.push({t:el.textContent.trim().slice(0,24),w:Math.round(r.width),h:Math.round(r.height)});});
  return {rows,tap};
});

/* For pixel-mode elements the backdrop is whatever is painted BEHIND them, so
   they must be hidden before the sample or the probe reads their own glyphs.
   That race is what made the hero wordmark look like a 1:1 failure. */
const shotBehind = async () => {
  await p.evaluate(() => {
    document.querySelectorAll('#wordmark, .hdr, .skip').forEach((e) => { e.dataset.wasVis = e.style.visibility; e.style.visibility = 'hidden'; });
  });
  await sleep(320);
  const b64 = await p.screenshot({ encoding: 'base64' });
  await p.evaluate(() => {
    document.querySelectorAll('#wordmark, .hdr, .skip').forEach((e) => { e.style.visibility = e.dataset.wasVis || ''; });
  });
  await sleep(120);
  return b64;
};

const runs = [];
runs.push({ label: 'top of page', data: await audit(), shot: await shotBehind() });
// the header changes ground once past the hero, so audit that state as well
await p.evaluate(() => { document.documentElement.style.scrollBehavior='auto'; document.querySelector('#verdskra').scrollIntoView({block:'start'}); });
await sleep(900);
runs.push({ label: 'scrolled past hero', data: await audit(), shot: await shotBehind() });

// for text over the hero video, measure the ACTUAL rendered backdrop pixels
let png = null;
const px=(x,y)=>{const i=(png.width*y+x)<<2; return [png.data[i],png.data[i+1],png.data[i+2]];};
const lum=(c)=>{const [r,g,bl]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*bl};
const fails=[];
for (const run of runs) {
png = PNG.sync.read(Buffer.from(run.shot,'base64'));
for(const r of run.data.rows){
  if(r.mode==='CSS'){ fails.push(`${r.ratio} (need ${r.need})  ${r.t}  [${r.cls}]`); continue; }
  // sample a band under the element and take the WORST (lightest) backdrop pixel
  let worst=null, worstL=-1;
  for(let dx=-140;dx<=140;dx+=14){ const x=Math.min(png.width-1,Math.max(0,r.x+dx));
    for(let dy=14;dy<=30;dy+=8){ const y=Math.min(png.height-1,Math.max(0,r.y+dy));
      const c=px(x,y), L=lum(c); if(L>worstL){worstL=L; worst=c;} } }
  const fg=r.fg.map((v,i)=>v*r.fga+worst[i]*(1-r.fga));
  const L1=lum(fg), L2=worstL;
  const ratio=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
  if(ratio<r.need) fails.push(`[${run.label}] ${Math.round(ratio*100)/100} (need ${r.need})  ${r.t}  [${r.cls}] eff-op=${r.eff}  worst backdrop rgb(${worst})`);
}
}
console.log('CONTRAST FAILURES ('+fails.length+'):'); fails.forEach(f=>console.log('  '+f));
const tap = runs[0].data.tap;
console.log('\nSMALL TAP TARGETS ('+tap.length+'):'); tap.forEach(t=>console.log('  '+JSON.stringify(t)));
await b.close();
