import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const decks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/decks' }),
  schema: z.object({
    title: z.string().min(1),
    format: z.string().min(1),
    decklist: z.string().regex(/^[^/\\]+\.dec$/i, 'Must name a .dec file inside /decks.'),
  }),
});

export const collections = { decks };
