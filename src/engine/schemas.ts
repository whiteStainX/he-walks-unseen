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

export const StatusEffectDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

export const StatusEffectsSchema = z.record(StatusEffectDefinitionSchema);

export const EffectDefinitionSchema = z.object({
  id: z.string(),
  description: z.string(),
});

export const EffectsSchema = z.record(EffectDefinitionSchema);

export const AiStateDefinitionSchema = z.object({
  id: z.string(),
  description: z.string(),
});

export const AiStatesSchema = z.record(AiStateDefinitionSchema);

export const EquipmentSlotDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

export const EquipmentSlotsSchema = z.record(EquipmentSlotDefinitionSchema);

export const AttributeDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

export const AttributesSchema = z.record(AttributeDefinitionSchema);

export const MessageTypeDefinitionSchema = z.object({
  id: z.string(),
  description: z.string(),
});

export const MessageTypesSchema = z.record(MessageTypeDefinitionSchema);