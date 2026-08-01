import { normalizeCardName } from '../deck/resolver';
import type { ParsedDeck } from '../deck/types';

export interface CardCount {
  name: string;
  quantity: number;
  colorIdentity?: string[];
}

export interface CountableCardEntry {
  name: string;
  quantity: number;
  colorIdentity?: string[];
}

/** Counts every card in the mainboard and supplemental sections of each deck. */
export function countCardsAcrossDecks(decks: Iterable<ParsedDeck>): CardCount[] {
  return countCardEntries([...decks].flatMap((deck) => [
    ...deck.mainboard,
    ...deck.sideboard,
    ...deck.commanders,
    ...deck.companion,
  ]));
}

export function countCardEntries(entries: Iterable<CountableCardEntry>): CardCount[] {
  const counts = new Map<string, CardCount>();

  for (const entry of entries) {
    const key = normalizeCardName(entry.name);
    const count = counts.get(key) ?? {
      name: entry.name,
      quantity: 0,
      ...(entry.colorIdentity ? { colorIdentity: entry.colorIdentity } : {}),
    };
    count.quantity += entry.quantity;
    counts.set(key, count);
  }

  return [...counts.values()].sort((left, right) =>
    right.quantity - left.quantity || left.name.localeCompare(right.name),
  );
}
