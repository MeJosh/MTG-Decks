import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { MoxfieldDeck } from './moxfield-client.ts';
import { importMoxfieldDeck, serializeDeck, slugifyDeckName } from './importer.ts';

const temporaryDirectories: string[] = [];

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'mtg-decks-import-'));
  temporaryDirectories.push(root);
  await mkdir(path.join(root, 'decks'));
  await mkdir(path.join(root, 'src', 'content', 'decks'), { recursive: true });
  return root;
}

function sourceDeck(): MoxfieldDeck {
  return {
    publicId: 'abc123',
    sourceUrl: 'https://www.moxfield.com/decks/abc123',
    name: "Josh's Commander Deck",
    format: 'commander',
    commanders: [
      { quantity: 1, name: 'Lathril, Blade of the Elves', printing: { set: 'KHM', collectorNumber: '222' } },
    ],
    companion: [],
    mainboard: [
      { quantity: 99, name: 'Forest', printing: { set: 'UNH', collectorNumber: '140' } },
    ],
    sideboard: [],
  };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe('Moxfield importer', () => {
  it('serializes only populated optional sections', () => {
    const source = serializeDeck(sourceDeck());
    expect(source).toContain('COMMANDER:');
    expect(source).toContain('MAINBOARD:');
    expect(source).not.toContain('COMPANION:');
    expect(source).not.toContain('SIDEBOARD:');
  });

  it('derives stable kebab-case slugs', () => {
    expect(slugifyDeckName("Josh's Café Deck")).toBe('joshs-cafe-deck');
  });

  it('updates only the decklist for an existing source identity', async () => {
    const root = await fixtureRoot();
    const markdownPath = path.join(root, 'src', 'content', 'decks', 'local-name.md');
    const deckPath = path.join(root, 'decks', 'custom-list.dec');
    const markdown = `---
title: Local Title
format: Local Format
decklist: custom-list.dec
source: https://moxfield.com/decks/abc123?utm_source=old
---

## Primer

Keep this local text.
`;
    await writeFile(markdownPath, markdown);
    await writeFile(deckPath, '1 Island\n');

    const result = await importMoxfieldDeck({
      cwd: root,
      source: 'https://www.moxfield.com/decks/abc123',
      loadDeck: async () => sourceDeck(),
      warmCache: async () => {},
    });

    expect(result.action).toBe('updated');
    expect(await readFile(markdownPath, 'utf8')).toBe(markdown);
    expect(await readFile(deckPath, 'utf8')).toContain('Lathril, Blade of the Elves');
  });

  it('preserves an existing decklist when cache warming fails', async () => {
    const root = await fixtureRoot();
    const markdownPath = path.join(root, 'src', 'content', 'decks', 'deck.md');
    const deckPath = path.join(root, 'decks', 'deck.dec');
    await writeFile(markdownPath, `---
title: Local
format: Commander
decklist: deck.dec
source: https://www.moxfield.com/decks/abc123
---
`);
    await writeFile(deckPath, '1 Island\n');

    await expect(importMoxfieldDeck({
      cwd: root,
      source: 'https://www.moxfield.com/decks/abc123',
      loadDeck: async () => sourceDeck(),
      warmCache: async () => { throw new Error('resolution failed'); },
    })).rejects.toThrow('resolution failed');
    expect(await readFile(deckPath, 'utf8')).toBe('1 Island\n');
  });

  it('creates matching Markdown and decklist filenames for a new source', async () => {
    const root = await fixtureRoot();
    const result = await importMoxfieldDeck({
      cwd: root,
      source: 'https://www.moxfield.com/decks/abc123',
      loadDeck: async () => sourceDeck(),
      warmCache: async () => {},
    });

    expect(result.action).toBe('created');
    expect(path.basename(result.markdownPath)).toBe('joshs-commander-deck.md');
    expect(path.basename(result.deckPath)).toBe('joshs-commander-deck.dec');
    expect(await readFile(result.markdownPath, 'utf8')).toContain('source: https://www.moxfield.com/decks/abc123');
    expect(await readFile(result.markdownPath, 'utf8')).toContain(
      'featuredCard: "Lathril, Blade of the Elves"',
    );
  });

  it('uses a custom title without changing the generated slug', async () => {
    const root = await fixtureRoot();
    const result = await importMoxfieldDeck({
      cwd: root,
      source: 'https://www.moxfield.com/decks/abc123',
      title: 'My Local Commander Deck',
      loadDeck: async () => sourceDeck(),
      warmCache: async () => {},
    });

    expect(path.basename(result.markdownPath)).toBe('joshs-commander-deck.md');
    expect(await readFile(result.markdownPath, 'utf8')).toContain('title: "My Local Commander Deck"');
  });

  it('rejects a title override when re-importing', async () => {
    const root = await fixtureRoot();
    await writeFile(path.join(root, 'src', 'content', 'decks', 'deck.md'), `---
title: Local
format: Commander
decklist: deck.dec
source: https://www.moxfield.com/decks/abc123
---
`);
    await writeFile(path.join(root, 'decks', 'deck.dec'), '1 Island\n');

    await expect(importMoxfieldDeck({
      cwd: root,
      source: 'https://www.moxfield.com/decks/abc123',
      title: 'Replacement Title',
      loadDeck: async () => sourceDeck(),
      warmCache: async () => {},
    })).rejects.toThrow('--title may only be used when creating');
  });
});
