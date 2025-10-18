import { z } from 'zod';

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const MapConnectionSchema = z.object({
  id: z.string(),
  targetMapId: z.string(),
  targetPortalId: z.string(),
  position: PointSchema,
});

export const MapPrefabSchema = z.object({
  id: z.string(),
  position: PointSchema,
});

export const RandomPlacementSchema = z.object({
  count: z.number(),
  types: z.array(z.string()),
});

export const EntityPlacementSchema = z.object({
  placements: z.array(MapPrefabSchema).optional(),
  random: z.array(RandomPlacementSchema).optional(),
});

export const GeneratorSchema = z.object({
  type: z.enum(['digger', 'uniform']),
});

export const MapDefinitionSchema = z.object({
  id: z.string(),
  width: z.number(),
  height: z.number(),
  theme: z.string(),
  generator: GeneratorSchema,
  connections: z.array(MapConnectionSchema),
  entityPlacement: EntityPlacementSchema.optional(),
});

export const WorldSchema = z.object({
  maps: z.array(MapDefinitionSchema),
  startMapId: z.string(),
});