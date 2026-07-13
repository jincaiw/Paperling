import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

// The production site uses the custom GitHub Pages domain. Keeping the site
// URL here makes canonical URLs, sitemap entries, and generated asset links
// point at the same public address.
export default defineConfig({
  site: 'https://paper.mujizi.com',
  base: '/',
  trailingSlash: 'ignore',
  devToolbar: {
    enabled: false,
  },
  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()],
  },
});
