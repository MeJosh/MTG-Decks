<script setup lang="ts">
import Moon from '@primeicons/vue/moon';
import Sun from '@primeicons/vue/sun';
import { storeToRefs } from 'pinia';

import { useSettingsStore } from '../stores/settings';

const settingsStore = useSettingsStore();
const { isDark } = storeToRefs(settingsStore);
</script>

<template>
  <label class="theme-toggle">
    <input
      v-model="isDark"
      type="checkbox"
      role="switch"
      class="theme-toggle-input"
      :aria-label="isDark ? 'Use light theme' : 'Use dark theme'"
    />
    <span class="theme-toggle-track" aria-hidden="true">
      <span class="theme-toggle-handle">
        <Moon class="theme-toggle-icon theme-toggle-icon-moon" :size="12" />
        <Sun class="theme-toggle-icon theme-toggle-icon-sun" :size="12" />
      </span>
    </span>
  </label>
</template>

<style scoped>
.theme-toggle {
  position: relative;
  display: block;
  width: 2.875rem;
  height: 1.75rem;
  cursor: pointer;
}

.theme-toggle-input {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.theme-toggle-track {
  position: absolute;
  inset: 0;
  padding: .1875rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface-raised);
  transition: background .15s ease, border-color .15s ease;
}

.theme-toggle-input:checked + .theme-toggle-track {
  border-color: var(--accent);
  background: var(--accent);
}

.theme-toggle-handle {
  display: grid;
  width: 1.25rem;
  height: 1.25rem;
  place-items: center;
  border-radius: 999px;
  background: var(--surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .24);
  color: var(--ink);
  transition: transform .15s ease;
}

.theme-toggle-icon-moon {
  display: none;
}

.theme-toggle-input:checked + .theme-toggle-track .theme-toggle-icon-moon {
  display: block;
}

.theme-toggle-input:checked + .theme-toggle-track .theme-toggle-icon-sun {
  display: none;
}

.theme-toggle-input:checked + .theme-toggle-track .theme-toggle-handle {
  transform: translateX(1.125rem);
}

.theme-toggle-input:focus-visible + .theme-toggle-track {
  outline: 2px solid var(--accent);
  outline-offset: .2rem;
}

.theme-toggle:hover .theme-toggle-track {
  border-color: var(--line-strong);
}
</style>
