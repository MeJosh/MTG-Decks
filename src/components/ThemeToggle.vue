<script setup lang="ts">
import Moon from '@primeicons/vue/moon';
import Sun from '@primeicons/vue/sun';
import { storeToRefs } from 'pinia';
import ToggleSwitch from 'primevue/toggleswitch';

import { useThemeStore } from '../stores/theme';

const themeStore = useThemeStore();
const { isDark } = storeToRefs(themeStore);
</script>

<template>
  <ToggleSwitch
    v-model="isDark"
    class="theme-toggle"
    :aria-label="isDark ? 'Use light theme' : 'Use dark theme'"
  >
    <template #handle="{ checked }">
      <Moon v-if="checked" :size="12" aria-hidden="true" />
      <Sun v-else :size="12" aria-hidden="true" />
    </template>
  </ToggleSwitch>
</template>

<style scoped>
.theme-toggle {
  --p-toggleswitch-width: 2.875rem;
  --p-toggleswitch-height: 1.75rem;
  --p-toggleswitch-handle-size: 1.25rem;

  cursor: pointer;
}

:deep(.p-toggleswitch-slider) {
  border: 1px solid var(--line);
  box-shadow: none;
}

:deep(.p-toggleswitch-handle) {
  display: grid;
  place-items: center;
  color: var(--muted);
}

:deep(.p-toggleswitch-input:focus-visible + .p-toggleswitch-slider) {
  outline: 2px solid var(--accent);
  outline-offset: .2rem;
}

:deep(.p-toggleswitch-input:hover + .p-toggleswitch-slider) {
  border-color: var(--line-strong);
}
</style>
