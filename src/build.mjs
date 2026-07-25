import { mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { COPY } from './content.mjs';
import { render, punchMark } from './template.mjs';

/* Preview builds are published under a real business's brand on a URL that is
   not theirs. They are marked noindex and their canonical points at the preview
   itself, so this can never be indexed as, or compete with, erna.is. */
const PREVIEW_ORIGIN = process.env.PREVIEW_ORIGIN || '';
const isPreview = Boolean(PREVIEW_ORIGIN);

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, 'en'), { recursive: true });

// static assets
await cp(join(root, 'public'), dist, { recursive: true });

// favicon: the punch cartouche with the rising sun. Geometry only, no webfont.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">
<rect width="108" height="108" rx="14" fill="#09070E"/>
<g fill="none" stroke="#D3D4D3" stroke-width="4" stroke-linecap="round">
  <rect x="13" y="13" width="82" height="82" rx="20"/>
  <path d="M38 60 A16 16 0 0 1 70 60"/>
  <path d="M32 60 H76"/>
  <path d="M54 33 V40 M39 39 L43.5 43.5 M69 39 L64.5 43.5"/>
</g>
</svg>`;
await writeFile(join(dist, 'favicon.svg'), favicon);

const opts = { previewOrigin: PREVIEW_ORIGIN, noindex: isPreview };
await writeFile(join(dist, 'index.html'), render(COPY.is, { assetBase: '', ...opts }));
await writeFile(join(dist, 'en', 'index.html'), render(COPY.en, { assetBase: '../', ...opts }));
if (isPreview) await writeFile(join(dist, '.nojekyll'), '');

await writeFile(
  join(dist, 'robots.txt'),
  isPreview
    ? 'User-agent: *\nDisallow: /\n'
    : 'User-agent: *\nAllow: /\nSitemap: https://erna.is/sitemap.xml\n'
);
await writeFile(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>https://erna.is/</loc>
    <xhtml:link rel="alternate" hreflang="is" href="https://erna.is/"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://erna.is/en/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://erna.is/"/>
  </url>
  <url><loc>https://erna.is/en/</loc>
    <xhtml:link rel="alternate" hreflang="is" href="https://erna.is/"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://erna.is/en/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://erna.is/"/>
  </url>
</urlset>
`
);

console.log(`built dist/index.html + dist/en/index.html${isPreview ? ' [preview: noindex, origin ' + PREVIEW_ORIGIN + ']' : ''}`);
void punchMark;
