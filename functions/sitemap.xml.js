const SITE_URL = 'https://ccc.byron.wang';

const SITEMAP_URLS = Object.freeze([
  '/',
  '/agent.md'
]);

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const formatDate = (date) => date.toISOString().slice(0, 10);

const buildSitemap = (lastModifiedDate) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAP_URLS.map((pathname) => `  <url>
    <loc>${escapeXml(new URL(pathname, SITE_URL).href)}</loc>
    <lastmod>${lastModifiedDate}</lastmod>
  </url>`).join('\n')}
</urlset>
`;

export function onRequestGet() {
  const lastModifiedDate = formatDate(new Date());

  return new Response(buildSitemap(lastModifiedDate), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
