import { describe, expect, it } from 'vitest';

import type { ResolvedDeckEntry } from './resolver';
import { calculateManaProfile, selectFeaturedCard } from './summary';

function entry(name: string, manaCost = '', quantity = 1): ResolvedDeckEntry {
  return {
    quantity,
    name,
    line: 1,
    card: {
      id: name,
      name,
      typeLine: 'Creature',
      manaCost,
      set: 'TST',
      setName: 'Test',
      collectorNumber: '1',
      releasedAt: '2026-01-01',
      scryfallUri: '#',
      image: `${name}.jpg`,
      artCrop: `${name}-art.jpg`,
    },
  };
}

describe('selectFeaturedCard', () => {
  it('defaults to the first maindeck card', () => {
    expect(selectFeaturedCard([entry('First'), entry('Second')], [], [], []).card).toMatchObject({
      name: 'First',
    });
  });

  it('selects a named card from any Deck section', () => {
    expect(
      selectFeaturedCard([entry('Main')], [], [entry('Sideboard Choice')], [], 'sideboard choice'),
    ).toMatchObject({ card: { name: 'Sideboard Choice' } });
  });

  it('falls back to the first maindeck card and warns when the named card is absent', () => {
    expect(selectFeaturedCard([entry('First')], [], [], [], 'Missing')).toMatchObject({
      card: { name: 'First' },
      warning: 'Featured Card "Missing" is not in the Deck; using "First" instead.',
    });
  });
});

describe('calculateManaProfile', () => {
  it('weights colored symbols by card quantity and splits hybrid symbols', () => {
    expect(
      calculateManaProfile(
        [entry('White spell', '{1}{W}{W}', 2), entry('Hybrid spell', '{W/U}', 2)],
        [entry('Blue commander', '{2}{U}')],
      ),
    ).toEqual([
      { color: 'W', weight: 5 },
      { color: 'U', weight: 2 },
    ]);
  });

  it('returns colorless when there are no colored symbols', () => {
    expect(calculateManaProfile([entry('Artifact', '{3}')], [])).toEqual([
      { color: 'C', weight: 1 },
    ]);
  });
});
