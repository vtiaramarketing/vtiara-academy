// Writes public/sitemap.xml (and the Sitemap line in robots.txt) from VITE_SITE_URL + the seeded course list.
// Runs automatically before `npm run build`. Without VITE_SITE_URL it skips, so no wrong URLs are published.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const env = { ...process.env };
for (const f of ['.env.production.local', '.env.production', '.env.local', '.env']) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const site = (env.VITE_SITE_URL || '').replace(/\/$/, '');
if (!site) { console.warn('[sitemap] VITE_SITE_URL is not set, so sitemap.xml was not generated.'); process.exit(0); }

const content = JSON.parse(readFileSync('src/data/content.json', 'utf8'));
const paths = ['/', '/courses', '/enquire', '/verify', '/privacy', '/terms', '/certificate-terms',
  ...content.courses.filter((c) => c.status !== 'draft' && c.status !== 'archived').map((c) => `/courses/${c.slug}`)];
const today = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${site}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`;
writeFileSync('public/sitemap.xml', xml);
const robots = readFileSync('public/robots.txt', 'utf8').replace(/^Sitemap:.*$/m, `Sitemap: ${site}/sitemap.xml`);
writeFileSync('public/robots.txt', robots);
console.log(`[sitemap] ${paths.length} URLs written for ${site}`);
