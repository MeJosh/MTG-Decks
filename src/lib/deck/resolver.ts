import type { DeckEntry, PrintingReference } from './types';

export interface CardPrinting {
  id: string;
  name: string;
  typeLine: string;
  manaCost: string;
  set: string;
  setName: string;
  collectorNumber: string;
  releasedAt: string;
  scryfallUri: string;
  image: string;
  backImage?: string;
}

export interface CardCatalog {
  byPrinting(set: string, collectorNumber: string): Promise<CardPrinting | undefined>;
  latestByName(name: string): Promise<CardPrinting | undefined>;
}

export type PreferredPrintings = Record<string, PrintingReference>;

export interface ResolvedDeckEntry extends DeckEntry {
  card: CardPrinting;
  warning?: string;
}

export class CardResolutionError extends Error {
  readonly entry: DeckEntry;

  constructor(entry: DeckEntry) {
    super(`Could not resolve "${entry.name}" from deck line ${entry.line}.`);
    this.name = 'CardResolutionError';
    this.entry = entry;
  }
}

export function normalizeCardName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/\s*\/{1,2}\s*/g, ' // ')
    .replaceAll(/\s+/g, ' ');
}

function isMatchingCard(entry: DeckEntry, card: CardPrinting | undefined): card is CardPrinting {
  return card !== undefined && normalizeCardName(entry.name) === normalizeCardName(card.name);
}

export async function resolveEntry(
  entry: DeckEntry,
  catalog: CardCatalog,
  preferred: PreferredPrintings,
): Promise<ResolvedDeckEntry> {
  let warning: string | undefined;

  if (entry.printing) {
    const exact = await catalog.byPrinting(
      entry.printing.set,
      entry.printing.collectorNumber,
    );
    if (isMatchingCard(entry, exact)) {
      return { ...entry, card: exact };
    }
    warning = `Printing (${entry.printing.set}) ${entry.printing.collectorNumber} could not be matched to ${entry.name}; showing a fallback printing.`;
  }

  const preference = preferred[normalizeCardName(entry.name)];
  if (preference) {
    const preferredCard = await catalog.byPrinting(preference.set, preference.collectorNumber);
    if (isMatchingCard(entry, preferredCard)) {
      return { ...entry, card: preferredCard, warning };
    }
    warning ??= `Preferred printing (${preference.set}) ${preference.collectorNumber} could not be matched to ${entry.name}; showing the latest printing.`;
  }

  const latest = await catalog.latestByName(entry.name);
  if (isMatchingCard(entry, latest)) {
    return { ...entry, card: latest, warning };
  }

  throw new CardResolutionError(entry);
}

export async function resolveEntries(
  entries: DeckEntry[],
  catalog: CardCatalog,
  preferred: PreferredPrintings,
): Promise<ResolvedDeckEntry[]> {
  const resolved: ResolvedDeckEntry[] = [];
  for (const entry of entries) {
    resolved.push(await resolveEntry(entry, catalog, preferred));
  }
  return resolved;
}
