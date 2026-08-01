# MTG Decks

A static Astro site for publishing Git-managed Magic: The Gathering decklists.

## Content

- Put portable decklists in `decks/*.dec`.
- Put deck pages in `src/content/decks/*.md`. The Markdown filename owns the URL slug.
- Point the frontmatter `decklist` field at any filename in `decks/`.
- Optionally set `featuredCard` to the name of a card in the Deck; otherwise the first maindeck card supplies the library tile artwork. If a sync removes the named card, the library falls back to the first maindeck card and marks the deck with a warning.
- Optionally add unique, free-form Deck Tags with `tags: [Aggro, Graveyard]`.
- Source-backed deck pages may include a canonical external `source` URL.
- Add preferred fallback printings to `config/preferred-printings.json`, keyed by lowercase card name.
- Scryfall metadata is generated under `.cache/card-data/` and committed to Git so production builds do not depend on Scryfall availability.

Portable decklists may use optional `COMMANDER:`, `COMPANION:`, `MAINBOARD:`, and `SIDEBOARD:` sections. Existing files without a `MAINBOARD:` marker remain valid. Commanders contribute to the Deck count; a Companion does not.

Library tiles derive their Mana Profile from colored mana symbols in the maindeck and Commanders, weighted by card quantity. Hybrid symbols divide their weight evenly among their colors.

## Importing from Moxfield

Import a public or unlisted Moxfield deck and warm its Scryfall cache:

```sh
pnpm import:moxfield https://www.moxfield.com/decks/<deck-id>
```

For a new source, the command creates matching files in `decks/` and `src/content/decks/`. Use `--slug <slug>` to override their generated name and `--title <title>` to override the initial local title. A later import of the same Moxfield deck replaces only the referenced `.dec` file and preserves the local title, format, slug, and Primer.

Add `--build` to run a full site build after importing. If Moxfield's unsupported public endpoint is unavailable, save its raw deck JSON and pass it with `--file <path>`; the Moxfield URL is still required as the deck's stable source identity.

Refresh every source-backed deck page with:

```sh
pnpm sync:moxfield
```

The command reports pages without a `source` URL as `Skipped`, continues after unavailable decks or other errors, and exits with status 1 if any refresh failed.

## Commands

```sh
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm check
pnpm build
pnpm import:moxfield <moxfield-url>
pnpm sync:moxfield
```

New or changed cards require a one-time Scryfall lookup to refresh `.cache/card-data/`; commit the resulting cache files with the deck changes. Builds then resolve existing cards without network access.
