import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DeckViewer from './DeckViewer.vue';
import type { DeckGroup } from '../lib/deck/grouping';
import type { ResolvedDeckEntry } from '../lib/deck/resolver';

function entry(name: string, id: string): ResolvedDeckEntry {
  return {
    quantity: 4,
    name,
    line: 1,
    card: {
      id,
      name,
      typeLine: 'Creature — Elf',
      manaCost: id === '1' ? '{2}{G}' : '{G}',
      set: 'TST',
      setName: 'Test Set',
      collectorNumber: id,
      releasedAt: '2026-01-01',
      scryfallUri: `https://scryfall.com/card/tst/${id}`,
      image: `https://cards.scryfall.io/${id}.jpg`,
      artCrop: `https://cards.scryfall.io/art/${id}.jpg`,
    },
  };
}

const first = entry('First Elf', '1');
const second = entry('Second Elf', '2');
const groups: DeckGroup[] = [
  { label: 'Creature', count: 8, entries: [first, second] },
];

describe('DeckViewer', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
  });

  it('previews the first card initially and changes when a card row is pointed at', async () => {
    const wrapper = mount(DeckViewer, {
      props: { groups, sideboard: [], commanders: [], companion: [], deckCount: 8, sideboardCount: 0 },
      global: { plugins: [createPinia()] },
    });

    expect(wrapper.get('[data-preview-image]').attributes('alt')).toContain('First Elf');
    expect(wrapper.findAll('[data-mana-for="1"] .mana-symbol').map((symbol) => symbol.attributes('alt'))).toEqual([
      '{2}',
      '{G}',
    ]);
    await wrapper.get('[data-card-row="2"]').trigger('pointerenter');
    expect(wrapper.get('[data-preview-image]').attributes('alt')).toContain('Second Elf');
  });

  it('opens a preview dialog instead of navigating on touch devices', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    const wrapper = mount(DeckViewer, {
      props: { groups, sideboard: [], commanders: [], companion: [], deckCount: 8, sideboardCount: 0 },
      global: { plugins: [createPinia()] },
    });

    await wrapper.get('[data-card-id="2"]').trigger('click');
    expect(wrapper.get('[role="dialog"]').text()).toContain('Second Elf');
  });

  it('shows only populated supplemental sections and includes Commanders in the Deck count', () => {
    const commander = entry('Lathril, Blade of the Elves', '3');
    commander.quantity = 1;
    const wrapper = mount(DeckViewer, {
      props: {
        groups,
        sideboard: [],
        commanders: [commander],
        companion: [],
        deckCount: 9,
        sideboardCount: 0,
      },
      global: { plugins: [createPinia()] },
    });

    expect(wrapper.get('#deck-heading').element.parentElement?.textContent).toContain('9');
    expect(wrapper.get('#commander-heading').text()).toBe('Commander');
    expect(wrapper.text()).not.toContain('Companion');
    expect(wrapper.text()).not.toContain('Sideboard');
  });
});
