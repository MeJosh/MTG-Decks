import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mejosh.github.io',
  base: '/MTG-Decks',
  markdown: {
    shikiConfig: {
      langAlias: {
        'sideboard-in': 'plaintext',
        'sideboard-out': 'plaintext',
      },
    },
  },
  integrations: [vue({ appEntrypoint: './src/vue-app.ts' })],
  vite: {
    define: {
      __VUE_PROD_DEVTOOLS__: 'false',
    },
    plugins: [tailwindcss()],
  },
});
