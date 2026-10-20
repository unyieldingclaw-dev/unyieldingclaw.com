import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://unyieldingclaw.com',
  output: 'static',
  build: {
    // Shared CSS stays cacheable across the generated pages.
    inlineStylesheets: 'auto',
  },
  integrations: [
    sitemap({
      namespaces: {
        news: false,
        xhtml: false,
        video: false,
      },
    }),
  ],
});
