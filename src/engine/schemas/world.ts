import { z } from 'zod';
import { PointSchema } from './common.js';

const MapConnectionSchema = z.object({
  id: z.string(),
  targetMapId: z.string(),
  targetPortalId: z.string(),
  position: PointSchema,
});

const MapPrefabSchema = z.object({
  id: z.string(),
  position: PointSchema,
});

const GeneratorSchema = z.object({
  type: z.enum(['digger']),
});

export const MapDefinitionSchema = z.object({
  id: z.string(),
  width: z.number(),
  height: z.number(),
  theme: z.string(),
  generator: GeneratorSchema,
  connections: z.array(MapConnectionSchema).default([]),
  prefabs: z.array(MapPrefabSchema).optional(),
});

export const WorldSchema = z.object({
  maps: z.array(MapDefinitionSchema),
  startMapId: z.string(),
});
