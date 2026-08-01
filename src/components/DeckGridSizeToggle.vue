<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { watch } from 'vue';

import { type GridSize, useSettingsStore } from '../stores/settings';

const settingsStore = useSettingsStore();
const { gridSize } = storeToRefs(settingsStore);

function applyGridSize(size: GridSize) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.deckGridSize = size;
}

function setGridSize(size: GridSize) {
  settingsStore.setGridSize(size);
}

watch(gridSize, applyGridSize, { immediate: true });
</script>

<template>
  <div class="deck-grid-size" role="group" aria-label="Deck tile size">
    <button
      class="deck-grid-size-button"
      type="button"
      aria-label="Use large deck tiles"
      :aria-pressed="gridSize === 'large'"
      title="Large tiles"
      @click="setGridSize('large')"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="4" width="8" height="6" rx="1" /><rect x="13" y="4" width="8" height="6" rx="1" /><rect x="3" y="14" width="8" height="6" rx="1" /><rect x="13" y="14" width="8" height="6" rx="1" /></svg>
    </button>
    <button
      class="deck-grid-size-button"
      type="button"
      aria-label="Use compact deck tiles"
      :aria-pressed="gridSize === 'small'"
      title="Compact tiles"
      @click="setGridSize('small')"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="3" width="4" height="4" rx=".7" /><rect x="10" y="3" width="4" height="4" rx=".7" /><rect x="17" y="3" width="4" height="4" rx=".7" /><rect x="3" y="10" width="4" height="4" rx=".7" /><rect x="10" y="10" width="4" height="4" rx=".7" /><rect x="17" y="10" width="4" height="4" rx=".7" /><rect x="3" y="17" width="4" height="4" rx=".7" /><rect x="10" y="17" width="4" height="4" rx=".7" /><rect x="17" y="17" width="4" height="4" rx=".7" /></svg>
    </button>
  </div>
</template>
