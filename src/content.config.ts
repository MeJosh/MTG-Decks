import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const tags = z
  .array(z.string().trim().min(1, 'Deck Tags must not be empty.'))
  .superRefine((values, context) => {
    const seen = new Set<string>();
    for (const value of values) {
      const normalized = value.toLocaleLowerCase('en-US');
      if (seen.has(normalized)) {
        context.addIssue({
          code: 'custom',
          message: `Deck Tags must be unique ignoring case; found "${value}" more than once.`,
        });
      }
      seen.add(normalized);
    }
  })
  .default([]);

const decks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/decks' }),
  schema: z.object({
    title: z.string().min(1),
    format: z.string().min(1),
    decklist: z.string().regex(/^[^/\\]+\.dec$/i, 'Must name a .dec file inside /decks.'),
    featuredCard: z.string().trim().min(1).optional(),
    tags,
    source: z.url().optional(),
  }),
});

export const collections = { decks };
