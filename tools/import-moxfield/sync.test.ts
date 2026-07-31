import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { syncMoxfieldDecks } from './sync.ts';

const temporaryDirectories: string[] = [];

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'mtg-decks-sync-'));
  temporaryDirectories.push(root);
  await mkdir(path.join(root, 'src', 'content', 'decks'), { recursive: true });
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe('Moxfield sync', () => {
  it('updates source-backed decks, skips local decks, and continues after errors', async () => {
    const root = await fixtureRoot();
    const contentDirectory = path.join(root, 'src', 'content', 'decks');
    await writeFile(path.join(contentDirectory, 'local.md'), '---\ntitle: Local\n---\n');
    await writeFile(path.join(contentDirectory, 'first.md'), '---\nsource: https://www.moxfield.com/decks/first\n---\n');
    await writeFile(path.join(contentDirectory, 'broken.md'), '---\nsource: https://www.moxfield.com/decks/broken\n---\n');
    await writeFile(path.join(contentDirectory, 'last.md'), '---\nsource: https://www.moxfield.com/decks/last\n---\n');
    const importDeck = vi.fn(async (source: string) => {
      if (source.endsWith('/broken')) throw new Error('Deck no longer exists');
      return { action: 'updated' as const, markdownPath: '', deckPath: '', sourceUrl: source };
    });

    const results = await syncMoxfieldDecks({ cwd: root, importDeck });

    expect(importDeck).toHaveBeenCalledTimes(3);
    expect(results.filter((result) => result.status === 'updated')).toHaveLength(2);
    expect(results.find((result) => result.status === 'skipped')?.markdownPath).toBe(path.join(contentDirectory, 'local.md'));
    expect(results.find((result) => result.status === 'failed')).toMatchObject({
      source: 'https://www.moxfield.com/decks/broken',
      error: 'Deck no longer exists',
    });
  });
});
