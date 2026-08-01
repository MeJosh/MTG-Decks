import { describe, expect, it } from 'vitest';

import { countCardsAcrossDecks } from './card-counts';

describe('countCardsAcrossDecks', () => {
  it('sums matching card names across every deck section and sorts descending', () => {
    expect(countCardsAcrossDecks([
      {
        mainboard: [{ name: 'Lightning Bolt', quantity: 4, line: 1 }],
        sideboard: [{ name: 'Counterspell', quantity: 2, line: 2 }],
        commanders: [],
        companion: [],
      },
      {
        mainboard: [{ name: 'lightning bolt', quantity: 3, line: 1 }],
        sideboard: [],
        commanders: [{ name: 'Counterspell', quantity: 1, line: 2 }],
        companion: [{ name: 'Lurrus of the Dream-Den', quantity: 1, line: 3 }],
      },
    ])).toEqual([
      { name: 'Lightning Bolt', quantity: 7 },
      { name: 'Counterspell', quantity: 3 },
      { name: 'Lurrus of the Dream-Den', quantity: 1 },
    ]);
  });
});
