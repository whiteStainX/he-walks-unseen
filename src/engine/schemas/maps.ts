import { z } from 'zod';

const TilesSchema = z.array(z.array(z.string().min(1)));

export const MapSchema = z.object({
  width: z.number(),
  height: z.number(),
  tiles: TilesSchema,
});

export const MapCollectionSchema = z.record(MapSchema);
