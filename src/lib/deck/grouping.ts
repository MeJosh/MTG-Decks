import type { ResolvedDeckEntry } from './resolver';

const CATEGORY_ORDER = [
  'Creature',
  'Planeswalker',
  'Battle',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
  'Land',
] as const;

export interface DeckGroup {
  label: (typeof CATEGORY_ORDER)[number] | 'Other';
  entries: ResolvedDeckEntry[];
  count: number;
}

function categoryFor(typeLine: string): DeckGroup['label'] {
  return (
    CATEGORY_ORDER.find((category) => new RegExp(`\\b${category}\\b`, 'i').test(typeLine)) ??
    'Other'
  );
}

export function groupMainboard(entries: ResolvedDeckEntry[]): DeckGroup[] {
  const groups = new Map<DeckGroup['label'], ResolvedDeckEntry[]>();
  for (const entry of entries) {
    const category = categoryFor(entry.card.typeLine);
    const categoryEntries = groups.get(category) ?? [];
    categoryEntries.push(entry);
    groups.set(category, categoryEntries);
  }

  const orderedLabels: DeckGroup['label'][] = [...CATEGORY_ORDER, 'Other'];
  const orderedGroups: DeckGroup[] = [];
  for (const label of orderedLabels) {
    const categoryEntries = groups.get(label);
    if (!categoryEntries) continue;
    orderedGroups.push({
      label,
      entries: categoryEntries,
      count: categoryEntries.reduce((total, entry) => total + entry.quantity, 0),
    });
  }
  return orderedGroups;
}
