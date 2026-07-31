import { glob, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  importMoxfieldDeck,
  readPublishedDeckFile,
  type ImportResult,
} from './importer.ts';

export interface SyncResult {
  status: 'updated' | 'skipped' | 'failed';
  markdownPath: string;
  source?: string;
  error?: string;
}

export interface SyncOptions {
  cwd?: string;
  importDeck?: (source: string, cwd: string) => Promise<ImportResult>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Refreshes every source-backed deck page one at a time. A failure for one page
 * is recorded and does not prevent the remaining pages from being refreshed.
 */
export async function syncMoxfieldDecks(options: SyncOptions = {}): Promise<SyncResult[]> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const contentDirectory = path.join(cwd, 'src', 'content', 'decks');
  const importDeck = options.importDeck ?? ((source, root) => importMoxfieldDeck({ source, cwd: root }));
  const results: SyncResult[] = [];

  for await (const relativePath of glob('**/*.md', { cwd: contentDirectory })) {
    const markdownPath = path.join(contentDirectory, relativePath);
    let published;
    try {
      published = readPublishedDeckFile(markdownPath, await readFile(markdownPath, 'utf8'));
    } catch (error) {
      results.push({ status: 'failed', markdownPath, error: errorMessage(error) });
      continue;
    }

    if (!published.source) {
      results.push({ status: 'skipped', markdownPath });
      continue;
    }

    try {
      await importDeck(published.source, cwd);
      results.push({ status: 'updated', markdownPath, source: published.source });
    } catch (error) {
      results.push({
        status: 'failed',
        markdownPath,
        source: published.source,
        error: errorMessage(error),
      });
    }
  }

  return results;
}
