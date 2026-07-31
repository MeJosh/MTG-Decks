import { readFile } from 'node:fs/promises';
import path from 'node:path';

import preferredPrintings from '../../../config/preferred-printings.json';
import { ScryfallCatalog } from '../cards/scryfall';
import { groupMainboard } from './grouping';
import { parseDeck } from './parser';
import { resolveEntries } from './resolver';
import type { PreferredPrintings } from './resolver';
import { calculateManaProfile, selectFeaturedCard } from './summary';

export async function loadPublishedDeck(decklist: string, featuredCardName?: string) {
  if (
    path.basename(decklist) !== decklist ||
    path.extname(decklist).toLocaleLowerCase('en-US') !== '.dec'
  ) {
    throw new Error(`Decklist must name a .dec file inside /decks: ${decklist}`);
  }

  const deckPath = path.join(process.cwd(), 'decks', decklist);
  let source: string;
  try {
    source = await readFile(deckPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Decklist does not exist: ${decklist}`);
    }
    throw error;
  }

  const parsed = parseDeck(source);
  const catalog = new ScryfallCatalog();
  const preferred = preferredPrintings as PreferredPrintings;
  const mainboard = await resolveEntries(parsed.mainboard, catalog, preferred);
  const sideboard = await resolveEntries(parsed.sideboard, catalog, preferred);
  const commanders = await resolveEntries(parsed.commanders, catalog, preferred);
  const companion = await resolveEntries(parsed.companion, catalog, preferred);

  return {
    groups: groupMainboard(mainboard),
    sideboard,
    commanders,
    companion,
    featuredCard: selectFeaturedCard(
      mainboard,
      commanders,
      sideboard,
      companion,
      featuredCardName,
    ),
    manaProfile: calculateManaProfile(mainboard, commanders),
    deckCount: [...mainboard, ...commanders].reduce(
      (total, entry) => total + entry.quantity,
      0,
    ),
    sideboardCount: sideboard.reduce((total, entry) => total + entry.quantity, 0),
    warnings: [...mainboard, ...sideboard, ...commanders, ...companion].flatMap((entry) =>
      entry.warning ? [entry.warning] : [],
    ),
  };
}
