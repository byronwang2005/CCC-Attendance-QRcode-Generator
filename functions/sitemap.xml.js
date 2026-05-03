const SITE_URL = 'https://ccc.byron.wang';
const LAST_MODIFIED = '2026-05-03';

const SITEMAP_URLS = Object.freeze([
  { pathname: '/', changefreq: 'weekly', priority: '1.0' },
  { pathname: '/llms.txt', changefreq: 'monthly', priority: '0.9' },
  { pathname: '/llms-full.txt', changefreq: 'monthly', priority: '0.9' },
  { pathname: '/api/knowledge', changefreq: 'monthly', priority: '0.8' },
  { pathname: '/agent.md', changefreq: 'monthly', priority: '0.8' }
]);

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

export const buildSitemap = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAP_URLS.map(({ pathname, changefreq, priority }) => `  <url>
    <loc>${escapeXml(new URL(pathname, SITE_URL).href)}</loc>
    <lastmod>${LAST_MODIFIED}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

export function onRequestGet() {
  return new Response(buildSitemap(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
