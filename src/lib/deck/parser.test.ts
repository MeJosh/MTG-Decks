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
    expect(deck.commanders).toEqual([]);
    expect(deck.companion).toEqual([]);
  });

  it('parses optional Commander, Companion, mainboard, and sideboard sections', () => {
    const deck = parseDeck(`COMMANDER:
1 Reyhan, Last of the Abzan (C16) 40
1 Slurrk, All-Ingesting (CMR) 250

COMPANION:
1 Umori, the Collector (IKO) 231

MAINBOARD:
1 Forest

SIDEBOARD:
1 Naturalize`);

    expect(deck.commanders.map((entry) => entry.name)).toEqual([
      'Reyhan, Last of the Abzan',
      'Slurrk, All-Ingesting',
    ]);
    expect(deck.companion.map((entry) => entry.name)).toEqual(['Umori, the Collector']);
    expect(deck.mainboard.map((entry) => entry.name)).toEqual(['Forest']);
    expect(deck.sideboard.map((entry) => entry.name)).toEqual(['Naturalize']);
  });

  it('ignores blank lines and a trailing newline', () => {
    expect(parseDeck('\n1 Island\n\n').mainboard).toHaveLength(1);
  });

  it('preserves nonstandard collector numbers', () => {
    expect(parseDeck('1 Example Card (TST) ★ 1').mainboard[0]?.printing).toEqual({
      set: 'TST',
      collectorNumber: '★ 1',
    });
  });

  it.each([
    ['zero quantity', '0 Island', 1],
    ['missing quantity', 'Island', 1],
    ['duplicate sideboard marker', '1 Island\nSIDEBOARD:\nSIDEBOARD:', 3],
    ['multiple companions', 'COMPANION:\n1 Umori\n1 Yorion\nMAINBOARD:\n1 Island', 3],
    ['multiple copies of a Commander', 'COMMANDER:\n2 Krark\nMAINBOARD:\n1 Island', 2],
  ])('rejects %s', (_, source, line) => {
    expect(() => parseDeck(source)).toThrow(DeckParseError);
    expect(() => parseDeck(source)).toThrow(`line ${line}`);
  });
});
