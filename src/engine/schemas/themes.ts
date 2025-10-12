import { z } from 'zod';

const ThemeMapSchema = z.object({
  wall: z.string().min(1),
  floor: z.string().min(1),
});

export const ThemeSchema = z.object({
  name: z.string(),
  floors: z.array(z.number()).optional(),
  enemies: z.array(z.string()).min(1),
  items: z.array(z.string()).min(1),
  map: ThemeMapSchema,
});

export const ThemeCollectionSchema = z.record(ThemeSchema);
