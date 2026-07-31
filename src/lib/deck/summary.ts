import { normalizeCardName } from './resolver';
import type { CardPrinting, ResolvedDeckEntry } from './resolver';

export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';

export interface ManaProfileSegment {
  color: ManaColor;
  weight: number;
}

const MANA_COLORS: Exclude<ManaColor, 'C'>[] = ['W', 'U', 'B', 'R', 'G'];

export function selectFeaturedCard(
  mainboard: ResolvedDeckEntry[],
  commanders: ResolvedDeckEntry[],
  sideboard: ResolvedDeckEntry[],
  companion: ResolvedDeckEntry[],
  featuredCardName?: string,
): CardPrinting {
  if (!featuredCardName) return mainboard[0]!.card;

  const normalizedName = normalizeCardName(featuredCardName);
  const entry = [...mainboard, ...commanders, ...sideboard, ...companion].find(
    (candidate) => normalizeCardName(candidate.name) === normalizedName,
  );

  if (!entry) {
    throw new Error(`Featured Card "${featuredCardName}" is not in the Deck.`);
  }

  return entry.card;
}

export function calculateManaProfile(
  mainboard: ResolvedDeckEntry[],
  commanders: ResolvedDeckEntry[],
): ManaProfileSegment[] {
  const weights = new Map<Exclude<ManaColor, 'C'>, number>(
    MANA_COLORS.map((color) => [color, 0]),
  );

  for (const entry of [...mainboard, ...commanders]) {
    for (const match of entry.card.manaCost.matchAll(/\{([^}]+)\}/g)) {
      const colors = MANA_COLORS.filter((color) => match[1]!.includes(color));
      if (colors.length === 0) continue;

      const symbolWeight = entry.quantity / colors.length;
      for (const color of colors) {
        weights.set(color, weights.get(color)! + symbolWeight);
      }
    }
  }

  const profile = MANA_COLORS.flatMap((color) => {
    const weight = weights.get(color)!;
    return weight > 0 ? [{ color, weight }] : [];
  });

  return profile.length > 0 ? profile : [{ color: 'C', weight: 1 }];
}
