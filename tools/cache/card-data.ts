import { createHash } from 'node:crypto';
import { readdir, readFile, rm, unlink } from 'node:fs/promises';
import path from 'node:path';

import { parseDeck } from '../../src/lib/deck/parser.ts';
import { normalizeCardName, type PreferredPrintings } from '../../src/lib/deck/resolver.ts';
import type { DeckEntry } from '../../src/lib/deck/types.ts';

const CACHE_DIRECTORY = path.join('.cache', 'card-data');

function printingKey(set: string, collectorNumber: string): string {
  return `printing-${encodeURIComponent(set.toLowerCase())}-${encodeURIComponent(collectorNumber.toLowerCase())}`;
}

function latestKey(name: string): string {
  const hash = createHash('sha256').update(name.toLocaleLowerCase('en-US')).digest('hex');
  return `latest-${hash}`;
}

function keysForEntry(entry: DeckEntry, preferred: PreferredPrintings): string[] {
  const keys = [latestKey(entry.name)];
  if (entry.printing) keys.push(printingKey(entry.printing.set, entry.printing.collectorNumber));

  const preference = preferred[normalizeCardName(entry.name)];
  if (preference) keys.push(printingKey(preference.set, preference.collectorNumber));
  return keys;
}

export async function usedCardDataKeys(cwd: string): Promise<Set<string>> {
  const decksDirectory = path.join(cwd, 'decks');
  const preferredPath = path.join(cwd, 'config', 'preferred-printings.json');
  const preferred = JSON.parse(await readFile(preferredPath, 'utf8')) as PreferredPrintings;
  const deckFiles = (await readdir(decksDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.dec')
    .map((entry) => entry.name);
  const keys = new Set<string>();

  for (const deckFile of deckFiles) {
    const deck = parseDeck(await readFile(path.join(decksDirectory, deckFile), 'utf8'));
    for (const entry of [...deck.mainboard, ...deck.sideboard, ...deck.commanders, ...deck.companion]) {
      for (const key of keysForEntry(entry, preferred)) keys.add(key);
    }
  }
  return keys;
}

export async function cleanCardData(cwd: string): Promise<void> {
  await rm(path.join(cwd, CACHE_DIRECTORY), { recursive: true, force: true });
}

export async function pruneCardData(cwd: string): Promise<string[]> {
  const cacheDirectory = path.join(cwd, CACHE_DIRECTORY);
  const usedKeys = await usedCardDataKeys(cwd);
  let cacheFiles;
  try {
    cacheFiles = await readdir(cacheDirectory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const removed: string[] = [];
  for (const cacheFile of cacheFiles) {
    if (!cacheFile.isFile() || path.extname(cacheFile.name) !== '.json') continue;
    const key = path.basename(cacheFile.name, '.json');
    if (usedKeys.has(key)) continue;
    await unlink(path.join(cacheDirectory, cacheFile.name));
    removed.push(cacheFile.name);
  }
  return removed.sort();
}
