import { describe, expect, it, vi } from 'vitest';

import { CardResolutionError, resolveEntry } from './resolver';
import type { CardCatalog, CardPrinting } from './resolver';
import type { DeckEntry } from './types';

const hunter: CardPrinting = {
  id: 'hunter',
  name: 'Avenging Hunter',
  typeLine: 'Creature — Dragon Ranger',
  manaCost: '{4}{G}',
  set: 'CLB',
  setName: 'Commander Legends: Battle for Baldur’s Gate',
  collectorNumber: '215',
  releasedAt: '2022-06-10',
  scryfallUri: 'https://scryfall.com/card/clb/215/avenging-hunter',
  image: 'https://cards.scryfall.io/normal/example.jpg',
  artCrop: 'https://cards.scryfall.io/art_crop/example.jpg',
};

function catalog(overrides: Partial<CardCatalog> = {}): CardCatalog {
  return {
    byPrinting: vi.fn(async () => undefined),
    latestByName: vi.fn(async () => undefined),
    ...overrides,
  };
}

const exactEntry: DeckEntry = {
  quantity: 4,
  name: 'Avenging Hunter',
  printing: { set: 'CLB', collectorNumber: '215' },
  line: 1,
};

describe('resolveEntry', () => {
  it('uses a valid exact printing without a warning', async () => {
    const result = await resolveEntry(
      exactEntry,
      catalog({ byPrinting: vi.fn(async () => hunter) }),
      {},
    );

    expect(result.card).toBe(hunter);
    expect(result.warning).toBeUndefined();
  });

  it('falls back to latest and warns when an exact printing is invalid', async () => {
    const result = await resolveEntry(
      exactEntry,
      catalog({ latestByName: vi.fn(async () => hunter) }),
      {},
    );

    expect(result.card).toBe(hunter);
    expect(result.warning).toContain('(CLB) 215');
  });

  it('uses a preferred printing before latest when printing is omitted', async () => {
    const byPrinting = vi.fn(async () => hunter);
    const latestByName = vi.fn(async () => undefined);
    const entry: DeckEntry = { quantity: 4, name: 'Avenging Hunter', line: 1 };

    const result = await resolveEntry(entry, catalog({ byPrinting, latestByName }), {
      'avenging hunter': { set: 'CLB', collectorNumber: '215' },
    });

    expect(result.card).toBe(hunter);
    expect(byPrinting).toHaveBeenCalledWith('CLB', '215');
    expect(latestByName).not.toHaveBeenCalled();
  });

  it('rejects an entirely unresolved card', async () => {
    await expect(resolveEntry(exactEntry, catalog(), {})).rejects.toBeInstanceOf(
      CardResolutionError,
    );
  });
});
