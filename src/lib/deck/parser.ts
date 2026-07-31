import type { DeckEntry, ParsedDeck } from './types';

const SECTION_PATTERN = /^(MAINBOARD|SIDEBOARD|COMMANDER|COMPANION):$/i;
const ENTRY_PATTERN = /^(\d+)\s+(.+?)$/;
const PRINTING_PATTERN = /^(.*?)\s+\(([A-Za-z0-9]+)\)\s+(.+?)$/;

type DeckSection = keyof ParsedDeck;

const SECTION_BY_MARKER: Record<string, DeckSection> = {
  MAINBOARD: 'mainboard',
  SIDEBOARD: 'sideboard',
  COMMANDER: 'commanders',
  COMPANION: 'companion',
};

export class DeckParseError extends Error {
  readonly line: number;

  constructor(line: number, message: string) {
    super(`Deck syntax error on line ${line}: ${message}`);
    this.name = 'DeckParseError';
    this.line = line;
  }
}

function parseEntry(source: string, line: number): DeckEntry {
  const entryMatch = ENTRY_PATTERN.exec(source);
  if (!entryMatch) {
    throw new DeckParseError(line, 'expected "<quantity> <card name>".');
  }

  const quantity = Number(entryMatch[1]);
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new DeckParseError(line, 'quantity must be a positive integer.');
  }

  const remainder = entryMatch[2]?.trim() ?? '';
  if (!remainder) {
    throw new DeckParseError(line, 'card name is required.');
  }

  const printingMatch = PRINTING_PATTERN.exec(remainder);
  if (!printingMatch) {
    return { quantity, name: remainder, line };
  }

  const name = printingMatch[1]?.trim() ?? '';
  if (!name) {
    throw new DeckParseError(line, 'card name is required.');
  }

  return {
    quantity,
    name,
    printing: {
      set: printingMatch[2]!.toUpperCase(),
      collectorNumber: printingMatch[3]!,
    },
    line,
  };
}

export function parseDeck(source: string): ParsedDeck {
  const deck: ParsedDeck = { mainboard: [], sideboard: [], commanders: [], companion: [] };
  let section: DeckSection = 'mainboard';
  const foundSections = new Set<DeckSection>();

  for (const [index, rawLine] of source.replaceAll('\r\n', '\n').split('\n').entries()) {
    const line = index + 1;
    const sourceLine = rawLine.trim();
    if (!sourceLine) continue;

    const sectionMatch = SECTION_PATTERN.exec(sourceLine);
    if (sectionMatch) {
      const marker = sectionMatch[1]!.toUpperCase();
      section = SECTION_BY_MARKER[marker]!;
      if (foundSections.has(section)) {
        throw new DeckParseError(line, `${marker}: may appear only once.`);
      }
      foundSections.add(section);
      continue;
    }

    const entry = parseEntry(sourceLine, line);
    deck[section].push(entry);
  }

  if (deck.mainboard.length === 0) {
    throw new DeckParseError(1, 'maindeck must contain at least one card.');
  }
  if (deck.commanders.some((entry) => entry.quantity !== 1)) {
    const entry = deck.commanders.find((candidate) => candidate.quantity !== 1)!;
    throw new DeckParseError(entry.line, 'a Commander entry must have quantity 1.');
  }
  if (deck.companion.length > 1) {
    throw new DeckParseError(deck.companion[1]!.line, 'a Deck may have at most one Companion.');
  }
  if (deck.companion[0] && deck.companion[0].quantity !== 1) {
    throw new DeckParseError(deck.companion[0].line, 'a Companion entry must have quantity 1.');
  }

  return deck;
}
