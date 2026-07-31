import path from 'node:path';

import { importMoxfieldDeck } from './importer.ts';

interface CliOptions {
  source?: string;
  slug?: string;
  title?: string;
  file?: string;
  build: boolean;
  help: boolean;
}

const USAGE = `Usage: pnpm import:moxfield <url> [options]

Options:
  --slug <slug>  Override the local slug when creating a deck
  --title <title> Override the local title when creating a deck
  --file <path>  Read saved Moxfield deck JSON instead of fetching
  --build        Run the full Astro build after importing
  --help         Show this help
`;

function parseArguments(arguments_: string[]): CliOptions {
  const options: CliOptions = { build: false, help: false };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]!;
    if (argument === '--build') {
      options.build = true;
    } else if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else if (argument === '--slug' || argument === '--title' || argument === '--file') {
      const value = arguments_[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value.`);
      if (argument === '--slug') options.slug = value;
      else if (argument === '--title') options.title = value;
      else options.file = path.resolve(value);
      index += 1;
    } else if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`);
    } else if (options.source) {
      throw new Error('Provide exactly one Moxfield deck URL.');
    } else {
      options.source = argument;
    }
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(USAGE);
    return;
  }
  if (!options.source) throw new Error(`A Moxfield deck URL is required.\n\n${USAGE}`);

  const result = await importMoxfieldDeck({
    source: options.source,
    slug: options.slug,
    title: options.title,
    file: options.file,
    build: options.build,
  });
  const relativeDeck = path.relative(process.cwd(), result.deckPath);
  const relativeMarkdown = path.relative(process.cwd(), result.markdownPath);
  process.stdout.write(
    `${result.action === 'created' ? 'Created' : 'Updated'} ${relativeDeck}\n` +
    `${result.action === 'created' ? 'Created' : 'Preserved'} ${relativeMarkdown}\n` +
    `Source ${result.sourceUrl}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Moxfield import failed: ${message}\n`);
  process.exitCode = 1;
});
