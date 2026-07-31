import { normalizeCardName } from './resolver';
import type { CardPrinting, ResolvedDeckEntry } from './resolver';

export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';

export interface ManaProfileSegment {
  color: ManaColor;
  weight: number;
}

export interface FeaturedCardSelection {
  card: CardPrinting;
  warning?: string;
}

const MANA_COLORS: Exclude<ManaColor, 'C'>[] = ['W', 'U', 'B', 'R', 'G'];

export function selectFeaturedCard(
  mainboard: ResolvedDeckEntry[],
  commanders: ResolvedDeckEntry[],
  sideboard: ResolvedDeckEntry[],
  companion: ResolvedDeckEntry[],
  featuredCardName?: string,
): FeaturedCardSelection {
  const defaultCard = mainboard[0]!.card;
  if (!featuredCardName) return { card: defaultCard };

  const normalizedName = normalizeCardName(featuredCardName);
  const entry = [...mainboard, ...commanders, ...sideboard, ...companion].find(
    (candidate) => normalizeCardName(candidate.name) === normalizedName,
  );

  if (!entry) {
    return {
      card: defaultCard,
      warning: `Featured Card "${featuredCardName}" is not in the Deck; using "${defaultCard.name}" instead.`,
    };
  }

  return { card: entry.card };
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
