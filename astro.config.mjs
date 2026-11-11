// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import faqSchema from './src/integrations/faq-schema.mjs';
import lineIcons from './src/integrations/line-icons.mjs';

export default defineConfig({
  site: 'https://gacoachs.fr',
  trailingSlash: 'always',
  // styles intégrés dans chaque page : pas de feuille bloquante, affichage plus rapide
  build: { inlineStylesheets: 'always' },
  integrations: [
    // lineIcons(), // désactivé : émojis colorés conservés
    faqSchema(),
    sitemap({
      filter: (page) =>
        !page.includes('/espace-coach/') &&
        !page.includes('/admin/') &&
        !page.includes('/merci'),
    }),
  ],
});
