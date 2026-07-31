import { readFile } from 'node:fs/promises';

import { Impit } from 'impit';

export interface MoxfieldCard {
  quantity: number;
  name: string;
  printing?: {
    set: string;
    collectorNumber: string;
  };
}

export interface MoxfieldDeck {
  publicId: string;
  sourceUrl: string;
  name: string;
  format: string;
  mainboard: MoxfieldCard[];
  sideboard: MoxfieldCard[];
  commanders: MoxfieldCard[];
  companion: MoxfieldCard[];
}

const MOXFIELD_HOSTS = new Set(['moxfield.com', 'www.moxfield.com']);
const IGNORED_BOARDS = new Set(['maybeboard', 'tokens']);
const SUPPORTED_BOARDS = new Set(['mainboard', 'sideboard', 'commanders', 'companions']);

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Moxfield response has an invalid ${label}.`);
  }
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '' || /[\r\n]/.test(value)) {
    throw new Error(`Moxfield response is missing ${key}.`);
  }
  return value;
}

export function moxfieldDeckId(source: string): string {
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw new Error(`Invalid Moxfield deck URL: ${source}`);
  }

  if (url.protocol !== 'https:' || !MOXFIELD_HOSTS.has(url.hostname) || url.port) {
    throw new Error(`Expected an HTTPS Moxfield deck URL: ${source}`);
  }
  const match = /^\/decks\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname);
  if (!match) {
    throw new Error(`Expected a Moxfield URL shaped like https://www.moxfield.com/decks/<id>.`);
  }
  return match[1]!;
}

export function canonicalMoxfieldUrl(source: string): string {
  return `https://www.moxfield.com/decks/${moxfieldDeckId(source)}`;
}

function boardCards(boards: Record<string, unknown>, boardName: string): MoxfieldCard[] {
  const boardValue = boards[boardName];
  if (boardValue === undefined || boardValue === null) return [];
  const board = asRecord(boardValue, `${boardName} board`);
  const cards = asRecord(board.cards ?? {}, `${boardName} cards`);

  return Object.values(cards).map((value) => {
    const entry = asRecord(value, `${boardName} entry`);
    const card = asRecord(entry.card, `${boardName} card`);
    const quantity = entry.quantity;
    if (!Number.isSafeInteger(quantity) || (quantity as number) < 1) {
      throw new Error(`Moxfield ${boardName} contains an invalid quantity.`);
    }

    const name = requiredString(card, 'name');
    const set = card.set;
    const collectorNumber = card.cn;
    if (set === undefined && collectorNumber === undefined) {
      return { quantity: quantity as number, name };
    }
    if (
      typeof set !== 'string' ||
      !/^[A-Za-z0-9]+$/.test(set) ||
      typeof collectorNumber !== 'string' ||
      collectorNumber.trim() === '' ||
      /[\r\n]/.test(collectorNumber)
    ) {
      throw new Error(`Moxfield card ${name} has an incomplete Printing Reference.`);
    }
    return {
      quantity: quantity as number,
      name,
      printing: { set: set.toUpperCase(), collectorNumber },
    };
  });
}

export function parseMoxfieldDeck(payload: unknown, expectedPublicId: string): MoxfieldDeck {
  const deck = asRecord(payload, 'deck');
  const publicId = requiredString(deck, 'publicId');
  if (publicId !== expectedPublicId) {
    throw new Error(`Moxfield returned deck ${publicId} when ${expectedPublicId} was requested.`);
  }

  const boards = asRecord(deck.boards, 'boards');
  for (const [name, value] of Object.entries(boards)) {
    if (SUPPORTED_BOARDS.has(name) || IGNORED_BOARDS.has(name)) continue;
    const board = asRecord(value, `${name} board`);
    const count = board.count;
    if (typeof count !== 'number') {
      throw new Error(`Moxfield response has an invalid ${name} board count.`);
    }
    if (count > 0) {
      throw new Error(`Moxfield deck uses the unsupported ${name} board; no files were changed.`);
    }
  }

  const mainboard = boardCards(boards, 'mainboard');
  if (mainboard.length === 0) {
    throw new Error('Moxfield deck must contain at least one maindeck card.');
  }

  return {
    publicId,
    sourceUrl: `https://www.moxfield.com/decks/${publicId}`,
    name: requiredString(deck, 'name'),
    format: requiredString(deck, 'format'),
    mainboard,
    sideboard: boardCards(boards, 'sideboard'),
    commanders: boardCards(boards, 'commanders'),
    companion: boardCards(boards, 'companions'),
  };
}

async function fetchMoxfieldPayload(publicId: string): Promise<unknown> {
  const client = new Impit({ browser: 'chrome' });
  const response = await client.fetch(
    `https://api2.moxfield.com/v3/decks/all/${encodeURIComponent(publicId)}`,
    {
      headers: {
        accept: 'application/json',
        'accept-language': 'en-US,en;q=0.9',
        origin: 'https://moxfield.com',
        referer: 'https://moxfield.com/',
      },
    },
  );
  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `Moxfield returned HTTP ${response.status}. Its unsupported public endpoint may be blocking automated access; use --file with saved deck JSON if necessary.`,
    );
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new Error('Moxfield returned a non-JSON response. Its public endpoint may have changed.');
  }
}

export async function loadMoxfieldDeck(source: string, file?: string): Promise<MoxfieldDeck> {
  const publicId = moxfieldDeckId(source);
  let payload: unknown;
  if (file) {
    try {
      payload = JSON.parse(await readFile(file, 'utf8')) as unknown;
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(`Moxfield file is not valid JSON: ${file}`);
      throw error;
    }
  } else {
    payload = await fetchMoxfieldPayload(publicId);
  }
  return parseMoxfieldDeck(payload, publicId);
}
