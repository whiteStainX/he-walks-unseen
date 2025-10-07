import { z } from 'zod';

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const MapConnectionSchema = z.object({
  targetMapId: z.string(),
  targetPosition: PointSchema,
  position: PointSchema,
});

export const MapPrefabSchema = z.object({
  id: z.string(),
  position: PointSchema,
});

export const GeneratorSchema = z.object({
  type: z.enum(['digger']),
});

export const MapDefinitionSchema = z.object({
  id: z.string(),
  width: z.number(),
  height: z.number(),
  theme: z.string(),
  generator: GeneratorSchema,
  connections: z.array(MapConnectionSchema),
  prefabs: z.array(MapPrefabSchema).optional(),
});

export const WorldSchema = z.object({
  maps: z.array(MapDefinitionSchema),
  startMapId: z.string(),
});
