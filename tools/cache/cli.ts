import { cleanCardData, pruneCardData } from './card-data.ts';

const USAGE = 'Usage: pnpm cache:clean | pnpm cache:prune\n';

async function main() {
  const command = process.argv[2];
  if (command === 'clean') {
    await cleanCardData(process.cwd());
    process.stdout.write('Removed .cache/card-data/\n');
    return;
  }
  if (command === 'prune') {
    const removed = await pruneCardData(process.cwd());
    process.stdout.write(`Removed ${removed.length} unused card-data cache file${removed.length === 1 ? '' : 's'}.\n`);
    return;
  }
  throw new Error(USAGE);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
