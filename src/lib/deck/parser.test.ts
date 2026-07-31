import { describe, expect, it } from 'vitest';

import { DeckParseError, parseDeck } from './parser';

describe('parseDeck', () => {
  it('parses exact and omitted printings in the main deck and sideboard', () => {
    const deck = parseDeck(`4 Avenging Hunter (CLB) 215
3 Sagu Wildling / Roost Seek (TDM) 306
11 Forest

SIDEBOARD:
2 Viridian Longbow (PLST) AFC-221`);

    expect(deck.mainboard).toEqual([
      {
        quantity: 4,
        name: 'Avenging Hunter',
        printing: { set: 'CLB', collectorNumber: '215' },
        line: 1,
      },
      {
        quantity: 3,
        name: 'Sagu Wildling / Roost Seek',
        printing: { set: 'TDM', collectorNumber: '306' },
        line: 2,
      },
      { quantity: 11, name: 'Forest', line: 3 },
    ]);
    expect(deck.sideboard).toEqual([
      {
        quantity: 2,
        name: 'Viridian Longbow',
        printing: { set: 'PLST', collectorNumber: 'AFC-221' },
        line: 6,
      },
    ]);
  });

  it('ignores blank lines and a trailing newline', () => {
    expect(parseDeck('\n1 Island\n\n').mainboard).toHaveLength(1);
  });

  it.each([
    ['zero quantity', '0 Island', 1],
    ['missing quantity', 'Island', 1],
    ['duplicate sideboard marker', '1 Island\nSIDEBOARD:\nSIDEBOARD:', 3],
  ])('rejects %s', (_, source, line) => {
    expect(() => parseDeck(source)).toThrow(DeckParseError);
    expect(() => parseDeck(source)).toThrow(`line ${line}`);
  });
});
