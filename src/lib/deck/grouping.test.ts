import { expect, it } from 'vitest';

import { groupMainboard } from './grouping';
import type { ResolvedDeckEntry } from './resolver';

function entry(name: string, typeLine: string): ResolvedDeckEntry {
  return {
    quantity: 1,
    name,
    line: 1,
    card: {
      id: name,
      name,
      typeLine,
      manaCost: '',
      set: 'TST',
      setName: 'Test',
      collectorNumber: '1',
      releasedAt: '2026-01-01',
      scryfallUri: '#',
      image: '#',
    },
  };
}

it('groups the maindeck in the default order and preserves source order', () => {
  const groups = groupMainboard([
    entry('Forest', 'Basic Land — Forest'),
    entry('Second creature', 'Artifact Creature — Elf'),
    entry('Instant', 'Instant'),
    entry('First creature', 'Creature — Elf'),
    entry('Saga', 'Enchantment — Saga'),
  ]);

  expect(groups.map((group) => group.label)).toEqual([
    'Creature',
    'Instant',
    'Enchantment',
    'Land',
  ]);
  expect(groups[0]?.entries.map(({ name }) => name)).toEqual([
    'Second creature',
    'First creature',
  ]);
});
