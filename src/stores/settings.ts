import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

export const THEME_STORAGE_KEY = 'mtg-decks-theme';
export const AUTOCOMPLETE_STORAGE_KEY = 'mtg-decks-autocomplete';

export type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  } catch {
    // Storage may be unavailable in privacy-focused browser modes.
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initialAutocompleteEnabled() {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(AUTOCOMPLETE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<Theme>(initialTheme());
  const autocompleteEnabled = ref(initialAutocompleteEnabled());
  const isDark = computed({
    get: () => theme.value === 'dark',
    set: (value: boolean) => setTheme(value ? 'dark' : 'light'),
  });

  applyTheme(theme.value);

  function setTheme(nextTheme: Theme) {
    theme.value = nextTheme;
    applyTheme(nextTheme);

    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The visual preference still applies for the current page without storage.
    }
  }

  function setAutocompleteEnabled(enabled: boolean) {
    autocompleteEnabled.value = enabled;

    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(AUTOCOMPLETE_STORAGE_KEY, String(enabled));
    } catch {
      // The setting still applies for the current page without storage.
    }
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark');
  }

  return {
    theme,
    isDark,
    autocompleteEnabled,
    setTheme,
    setAutocompleteEnabled,
    toggleTheme,
  };
});
