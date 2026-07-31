import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

export const THEME_STORAGE_KEY = 'mtg-decks-theme';

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

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(initialTheme());
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

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark');
  }

  return { theme, isDark, setTheme, toggleTheme };
});
