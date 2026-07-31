import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { CardCatalog, CardPrinting } from '../deck/resolver';

interface ScryfallImageUris {
  normal?: string;
}

interface ScryfallCardFace {
  mana_cost?: string;
  image_uris?: ScryfallImageUris;
}

interface ScryfallCard {
  id: string;
  name: string;
  type_line: string;
  mana_cost?: string;
  set: string;
  set_name: string;
  collector_number: string;
  released_at: string;
  scryfall_uri: string;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
}

interface ScryfallList {
  data: ScryfallCard[];
}

function toCardPrinting(card: ScryfallCard): CardPrinting | undefined {
  const image = card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
  if (!image) return undefined;

  return {
    id: card.id,
    name: card.name,
    typeLine: card.type_line,
    manaCost: card.mana_cost ?? card.card_faces?.[0]?.mana_cost ?? '',
    set: card.set.toUpperCase(),
    setName: card.set_name,
    collectorNumber: card.collector_number,
    releasedAt: card.released_at,
    scryfallUri: card.scryfall_uri,
    image,
    backImage: card.card_faces?.[1]?.image_uris?.normal,
  };
}

export class ScryfallCatalog implements CardCatalog {
  readonly cacheDirectory: string;
  #lastRequestAt = 0;

  constructor(cacheDirectory = path.join(process.cwd(), '.cache', 'card-data')) {
    this.cacheDirectory = cacheDirectory;
  }

  async byPrinting(set: string, collectorNumber: string): Promise<CardPrinting | undefined> {
    const key = `printing-${set.toLowerCase()}-${collectorNumber.toLowerCase()}`;
    return this.#cached(key, async () => {
      const response = await this.#request(
        `https://api.scryfall.com/cards/${encodeURIComponent(set.toLowerCase())}/${encodeURIComponent(collectorNumber)}`,
      );
      if (response.status === 404) return undefined;
      if (!response.ok) throw new Error(`Scryfall returned ${response.status} for (${set}) ${collectorNumber}.`);
      return toCardPrinting((await response.json()) as ScryfallCard);
    });
  }

  async latestByName(name: string): Promise<CardPrinting | undefined> {
    const hash = createHash('sha256').update(name.toLocaleLowerCase('en-US')).digest('hex');
    return this.#cached(`latest-${hash}`, async () => {
      const parameters = new URLSearchParams({
        q: `!"${name.replaceAll('"', '\\"')}" game:paper lang:en`,
        unique: 'prints',
        order: 'released',
        dir: 'desc',
      });
      const response = await this.#request(`https://api.scryfall.com/cards/search?${parameters}`);
      if (response.status === 404) return undefined;
      if (!response.ok) throw new Error(`Scryfall returned ${response.status} while resolving ${name}.`);
      const list = (await response.json()) as ScryfallList;
      return list.data.map(toCardPrinting).find((card) => card !== undefined);
    });
  }

  async #cached(
    key: string,
    load: () => Promise<CardPrinting | undefined>,
  ): Promise<CardPrinting | undefined> {
    const cacheFile = path.join(this.cacheDirectory, `${key}.json`);
    try {
      const cached = JSON.parse(await readFile(cacheFile, 'utf8')) as Partial<CardPrinting>;
      if (typeof cached.manaCost === 'string') return cached as CardPrinting;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    const card = await load();
    if (card) {
      await mkdir(this.cacheDirectory, { recursive: true });
      await writeFile(cacheFile, `${JSON.stringify(card, undefined, 2)}\n`, 'utf8');
    }
    return card;
  }

  async #request(url: string): Promise<Response> {
    const wait = Math.max(0, 110 - (Date.now() - this.#lastRequestAt));
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    this.#lastRequestAt = Date.now();
    return fetch(url, {
      headers: {
        Accept: 'application/json;q=0.9,*/*;q=0.8',
        'User-Agent': 'MTG-Decks/0.1.0',
      },
    });
  }
}
