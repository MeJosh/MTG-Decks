import Aura from '@primeuix/themes/aura';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import type { App } from 'vue';

export default function setup(app: App) {
  const piniaRuntime = globalThis as Record<string, unknown>;
  piniaRuntime['__VUE_' + 'PROD_DEVTOOLS__'] ??= false;

  app.use(createPinia());
  app.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        darkModeSelector: '.dark',
      },
    },
  });
}
