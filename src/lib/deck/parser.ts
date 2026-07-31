import type { DeckEntry, ParsedDeck } from './types';

const SIDEBOARD_MARKER = 'SIDEBOARD:';
const ENTRY_PATTERN = /^(\d+)\s+(.+?)$/;
const PRINTING_PATTERN = /^(.*?)\s+\(([A-Za-z0-9]+)\)\s+([A-Za-z0-9-]+)$/;

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
  const deck: ParsedDeck = { mainboard: [], sideboard: [] };
  let inSideboard = false;
  let foundSideboard = false;

  for (const [index, rawLine] of source.replaceAll('\r\n', '\n').split('\n').entries()) {
    const line = index + 1;
    const sourceLine = rawLine.trim();
    if (!sourceLine) continue;

    if (sourceLine.toUpperCase() === SIDEBOARD_MARKER) {
      if (foundSideboard) {
        throw new DeckParseError(line, 'SIDEBOARD: may appear only once.');
      }
      foundSideboard = true;
      inSideboard = true;
      continue;
    }

    const entry = parseEntry(sourceLine, line);
    (inSideboard ? deck.sideboard : deck.mainboard).push(entry);
  }

  if (deck.mainboard.length === 0) {
    throw new DeckParseError(1, 'maindeck must contain at least one card.');
  }

  return deck;
}
