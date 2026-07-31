import { describe, expect, it } from 'vitest';

import {
  canonicalMoxfieldUrl,
  moxfieldDeckId,
  parseMoxfieldDeck,
} from './moxfield-client.ts';

function payload() {
  return {
    publicId: 'abc_123-x',
    name: 'Partner Deck',
    format: 'commander',
    boards: {
      mainboard: {
        count: 98,
        cards: {
          forest: {
            quantity: 98,
            card: { name: 'Forest', set: 'unh', cn: '140' },
          },
        },
      },
      sideboard: { count: 0, cards: {} },
      maybeboard: {
        count: 1,
        cards: { ignored: { quantity: 1, card: { name: 'Naturalize' } } },
      },
      commanders: {
        count: 2,
        cards: {
          one: { quantity: 1, card: { name: 'Reyhan', set: 'c16', cn: '40' } },
          two: { quantity: 1, card: { name: 'Slurrk', set: 'cmr', cn: '250' } },
        },
      },
      companions: { count: 0, cards: {} },
      signatureSpells: { count: 0, cards: {} },
      tokens: { count: 1, cards: {} },
    },
  };
}

describe('Moxfield client', () => {
  it('normalizes deck URLs to a stable identity', () => {
    const source = 'https://moxfield.com/decks/abc_123-x/?utm_source=test#cards';
    expect(moxfieldDeckId(source)).toBe('abc_123-x');
    expect(canonicalMoxfieldUrl(source)).toBe('https://www.moxfield.com/decks/abc_123-x');
  });

  it('extracts supported boards and ignores planning and token boards', () => {
    const deck = parseMoxfieldDeck(payload(), 'abc_123-x');
    expect(deck.mainboard).toEqual([
      {
        quantity: 98,
        name: 'Forest',
        printing: { set: 'UNH', collectorNumber: '140' },
      },
    ]);
    expect(deck.commanders.map((card) => card.name)).toEqual(['Reyhan', 'Slurrk']);
  });

  it('rejects a populated unsupported role-bearing board', () => {
    const source = payload();
    source.boards.signatureSpells = {
      count: 1,
      cards: { spell: { quantity: 1, card: { name: 'Lightning Bolt' } } },
    };
    expect(() => parseMoxfieldDeck(source, 'abc_123-x')).toThrow('signatureSpells');
  });
});
