import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://unyieldingclaw.com');
  const sitemapURL = new URL('sitemap-index.xml', base);

  return new Response(
    `User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
`,
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    },
  );
};
