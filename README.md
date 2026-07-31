# MTG Decks

A static Astro site for publishing Git-managed Magic: The Gathering decklists.

## Content

- Put portable decklists in `decks/*.dec`.
- Put deck pages in `src/content/decks/*.md`. The Markdown filename owns the URL slug.
- Point the frontmatter `decklist` field at any filename in `decks/`.
- Add preferred fallback printings to `config/preferred-printings.json`, keyed by lowercase card name.
- Scryfall metadata is generated under `.cache/card-data/`; this directory is ignored by Git and kept away from deck sources.

## Commands

```sh
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm check
pnpm build
```

The first build requires network access to resolve uncached cards through Scryfall. Later builds reuse the local ignored cache.
