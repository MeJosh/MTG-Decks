import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { access, glob, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ScryfallCatalog } from '../../src/lib/cards/scryfall.ts';
import { parseDeck } from '../../src/lib/deck/parser.ts';
import { resolveEntries, type PreferredPrintings } from '../../src/lib/deck/resolver.ts';
import type { ParsedDeck } from '../../src/lib/deck/types.ts';
import {
  canonicalMoxfieldUrl,
  loadMoxfieldDeck,
  moxfieldDeckId,
  type MoxfieldCard,
  type MoxfieldDeck,
} from './moxfield-client.ts';

export interface ImportOptions {
  source: string;
  slug?: string;
  title?: string;
  file?: string;
  build?: boolean;
  cwd?: string;
  loadDeck?: typeof loadMoxfieldDeck;
  warmCache?: (deck: ParsedDeck, cwd: string) => Promise<void>;
}

export interface ImportResult {
  action: 'created' | 'updated';
  markdownPath: string;
  deckPath: string;
  sourceUrl: string;
}

interface PublishedDeckFile {
  path: string;
  decklist?: string;
  source?: string;
}

const FORMAT_NAMES: Record<string, string> = {
  paupercommander: 'Pauper Commander',
  standardbrawl: 'Standard Brawl',
  competitivebrawl: 'Competitive Brawl',
  historicbrawl: 'Historic Brawl',
  canadianhighlander: 'Canadian Highlander',
};

function yamlScalar(frontmatter: string, key: string): string | undefined {
  const match = new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm').exec(frontmatter);
  if (!match) return undefined;
  const value = match[1]!.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function readPublishedDeckFile(filePath: string, source: string): PublishedDeckFile {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match) throw new Error(`Deck Markdown has invalid frontmatter: ${filePath}`);
  return {
    path: filePath,
    decklist: yamlScalar(match[1]!, 'decklist'),
    source: yamlScalar(match[1]!, 'source'),
  };
}

async function publishedDeckFiles(contentDirectory: string): Promise<PublishedDeckFile[]> {
  const files: PublishedDeckFile[] = [];
  for await (const relativePath of glob('**/*.md', { cwd: contentDirectory })) {
    const filePath = path.join(contentDirectory, relativePath);
    files.push(readPublishedDeckFile(filePath, await readFile(filePath, 'utf8')));
  }
  return files;
}

export function slugifyDeckName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replaceAll(/['’]/g, '')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');
  if (!slug) throw new Error(`Could not derive a slug from Moxfield deck name: ${name}`);
  return slug;
}

function validatedSlug(slug: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Slug must contain lowercase letters, numbers, and single hyphens only.');
  }
  return slug;
}

function displayFormat(format: string): string {
  const normalized = format.toLocaleLowerCase('en-US').replaceAll(/[^a-z0-9]/g, '');
  return FORMAT_NAMES[normalized] ?? format
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => `${word[0]!.toUpperCase()}${word.slice(1).toLocaleLowerCase('en-US')}`)
    .join(' ');
}

function cardLine(card: MoxfieldCard): string {
  const printing = card.printing
    ? ` (${card.printing.set}) ${card.printing.collectorNumber}`
    : '';
  return `${card.quantity} ${card.name}${printing}`;
}

export function serializeDeck(deck: MoxfieldDeck): string {
  const sections: string[] = [];
  if (deck.commanders.length) {
    sections.push(`COMMANDER:\n${deck.commanders.map(cardLine).join('\n')}`);
  }
  if (deck.companion.length) {
    sections.push(`COMPANION:\n${deck.companion.map(cardLine).join('\n')}`);
  }
  sections.push(`MAINBOARD:\n${deck.mainboard.map(cardLine).join('\n')}`);
  if (deck.sideboard.length) {
    sections.push(`SIDEBOARD:\n${deck.sideboard.map(cardLine).join('\n')}`);
  }
  return `${sections.join('\n\n')}\n`;
}

function validatedTitle(title: string): string {
  const normalized = title.trim();
  if (!normalized || /[\r\n]/.test(normalized)) {
    throw new Error('Title must be a nonempty single line.');
  }
  return normalized;
}

function newDeckMarkdown(deck: MoxfieldDeck, decklist: string, title?: string): string {
  return `---
title: ${JSON.stringify(validatedTitle(title ?? deck.name))}
format: ${JSON.stringify(displayFormat(deck.format))}
decklist: ${decklist}
source: ${deck.sourceUrl}
---

## Primer

Primer coming soon.
`;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function atomicReplace(filePath: string, contents: string): Promise<void> {
  const temporaryPath = `${filePath}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await writeFile(temporaryPath, contents, { encoding: 'utf8', flag: 'wx' });
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

async function createNewFiles(
  deckPath: string,
  deckSource: string,
  markdownPath: string,
  markdownSource: string,
): Promise<void> {
  await writeFile(deckPath, deckSource, { encoding: 'utf8', flag: 'wx' });
  try {
    await writeFile(markdownPath, markdownSource, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    await rm(deckPath, { force: true });
    throw error;
  }
}

export async function warmImportedDeckCache(deck: ParsedDeck, cwd: string): Promise<void> {
  const preferredPath = path.join(cwd, 'config', 'preferred-printings.json');
  const preferred = JSON.parse(await readFile(preferredPath, 'utf8')) as PreferredPrintings;
  const catalog = new ScryfallCatalog(path.join(cwd, '.cache', 'card-data'));
  await resolveEntries(deck.mainboard, catalog, preferred);
  await resolveEntries(deck.sideboard, catalog, preferred);
  await resolveEntries(deck.commanders, catalog, preferred);
  await resolveEntries(deck.companion, catalog, preferred);
}

async function runBuild(cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('pnpm', ['build'], { cwd, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`pnpm build failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}.`));
    });
  });
}

export async function importMoxfieldDeck(options: ImportOptions): Promise<ImportResult> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const sourceUrl = canonicalMoxfieldUrl(options.source);
  const publicId = moxfieldDeckId(sourceUrl);
  const contentDirectory = path.join(cwd, 'src', 'content', 'decks');
  const deckDirectory = path.join(cwd, 'decks');
  const published = await publishedDeckFiles(contentDirectory);
  const matches = published.filter((entry) => {
    if (!entry.source) return false;
    try {
      return moxfieldDeckId(entry.source) === publicId;
    } catch {
      return false;
    }
  });
  if (matches.length > 1) {
    throw new Error(`Multiple Deck Pages reference ${sourceUrl}; no files were changed.`);
  }
  if (matches.length === 1 && (options.slug || options.title)) {
    const option = options.slug ? '--slug' : '--title';
    throw new Error(`${option} may only be used when creating a new Source-Backed Published Deck.`);
  }

  const loadDeck = options.loadDeck ?? loadMoxfieldDeck;
  const sourceDeck = await loadDeck(sourceUrl, options.file);
  const deckSource = serializeDeck(sourceDeck);
  const parsed = parseDeck(deckSource);
  const warmCache = options.warmCache ?? warmImportedDeckCache;
  await warmCache(parsed, cwd);

  let result: ImportResult;
  const existing = matches[0];
  if (existing) {
    if (
      !existing.decklist ||
      path.basename(existing.decklist) !== existing.decklist ||
      path.extname(existing.decklist).toLocaleLowerCase('en-US') !== '.dec'
    ) {
      throw new Error(`Source-Backed Deck Page has an invalid decklist: ${existing.path}`);
    }
    const sharedBy = published.filter(
      (entry) => entry.path !== existing.path && entry.decklist === existing.decklist,
    );
    if (sharedBy.length) {
      throw new Error(`Decklist ${existing.decklist} is shared by another Deck Page; no files were changed.`);
    }
    const deckPath = path.join(deckDirectory, existing.decklist);
    if (!(await exists(deckPath))) {
      throw new Error(`Decklist does not exist: ${existing.decklist}`);
    }
    await atomicReplace(deckPath, deckSource);
    result = {
      action: 'updated',
      markdownPath: existing.path,
      deckPath,
      sourceUrl,
    };
  } else {
    const slug = validatedSlug(options.slug ?? slugifyDeckName(sourceDeck.name));
    const decklist = `${slug}.dec`;
    const markdownPath = path.join(contentDirectory, `${slug}.md`);
    const deckPath = path.join(deckDirectory, decklist);
    if ((await exists(markdownPath)) || (await exists(deckPath))) {
      throw new Error(`Local deck name ${slug} already exists; rerun with --slug <value>.`);
    }
    await createNewFiles(
      deckPath,
      deckSource,
      markdownPath,
      newDeckMarkdown(sourceDeck, decklist, options.title),
    );
    result = { action: 'created', markdownPath, deckPath, sourceUrl };
  }

  if (options.build) await runBuild(cwd);
  return result;
}
