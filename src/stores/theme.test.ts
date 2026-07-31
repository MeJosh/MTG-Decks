import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { THEME_STORAGE_KEY, useThemeStore } from './theme';

describe('theme store', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
      clear: vi.fn(() => values.clear()),
      key: vi.fn((index: number) => [...values.keys()][index] ?? null),
      get length() { return values.size; },
    };
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
    document.documentElement.classList.remove('dark');
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    setActivePinia(createPinia());
  });

  it('uses the device preference when no preference has been saved', () => {
    const store = useThemeStore();

    expect(store.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('prefers a saved theme and persists changes', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const store = useThemeStore();

    expect(store.theme).toBe('light');
    store.toggleTheme();
    expect(store.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });
});
