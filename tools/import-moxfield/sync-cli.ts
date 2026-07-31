import path from 'node:path';

import { syncMoxfieldDecks } from './sync.ts';

const USAGE = 'Usage: pnpm sync:moxfield\n';

async function main() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.includes('--help') || arguments_.includes('-h')) {
    process.stdout.write(USAGE);
    return;
  }
  if (arguments_.length) throw new Error(`Unknown option: ${arguments_[0]}\n\n${USAGE}`);

  const results = await syncMoxfieldDecks();
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const result of results) {
    const relativePath = path.relative(process.cwd(), result.markdownPath);
    if (result.status === 'updated') {
      updated += 1;
      process.stdout.write(`Updated ${relativePath}\n`);
    } else if (result.status === 'skipped') {
      skipped += 1;
      process.stdout.write(`Skipped ${relativePath} (no source URL)\n`);
    } else {
      failed += 1;
      process.stderr.write(`Failed ${relativePath}: ${result.error}\n`);
    }
  }

  process.stdout.write(`Sync complete: ${updated} updated, ${skipped} skipped, ${failed} failed.\n`);
  if (failed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Moxfield sync failed: ${message}\n`);
  process.exitCode = 1;
});
