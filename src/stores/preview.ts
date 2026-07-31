import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { CardPrinting } from '../lib/deck/resolver';

export const usePreviewStore = defineStore('card-preview', () => {
  const current = ref<CardPrinting>();
  const dialogOpen = ref(false);

  function preview(card: CardPrinting) {
    current.value = card;
  }

  function openDialog(card: CardPrinting) {
    current.value = card;
    dialogOpen.value = true;
  }

  function closeDialog() {
    dialogOpen.value = false;
  }

  return { current, dialogOpen, preview, openDialog, closeDialog };
});
