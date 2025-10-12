import { z } from 'zod';

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const HpSchema = z.object({
  current: z.number(),
  max: z.number(),
});

export const DoorInteractionSchema = z.object({
  type: z.literal('door'),
  isOpen: z.boolean(),
});

export const ChestInteractionSchema = z.object({
  type: z.literal('chest'),
  isLooted: z.boolean(),
  loot: z.string(),
});

export const StairsInteractionSchema = z.object({
  type: z.literal('stairs'),
  direction: z.enum(['up', 'down']),
});

export const PortalInteractionSchema = z.object({
  type: z.literal('portal'),
  id: z.string().optional(),
  targetMapId: z.string(),
  targetPortalId: z.string(),
});

export const ConversationInteractionSchema = z.object({
  type: z.literal('conversation'),
  parcelId: z.string(),
});

export const InteractionSchema = z.discriminatedUnion('type', [
  DoorInteractionSchema,
  ChestInteractionSchema,
  StairsInteractionSchema,
  PortalInteractionSchema,
  ConversationInteractionSchema,
]);

export const BaseEntitySchema = z.object({
  name: z.string(),
  char: z.string().min(1),
  color: z.string().optional(),
  interaction: InteractionSchema.optional(),
});

export const StatusEffectSchema = z.object({
  type: z.literal('poison'),
  duration: z.number(),
  potency: z.number(),
  chance: z.number(),
});

export const EquipmentSchema = z.object({
  slot: z.enum(['weapon', 'armor']),
  bonuses: z.object({
    attack: z.number().optional(),
    defense: z.number().optional(),
  }),
  onHit: StatusEffectSchema.optional(),
});

export const ItemEffectSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('heal'),
    potency: z.number(),
    requiresTarget: z.boolean(),
  }),
  z.object({
    type: z.literal('damage'),
    potency: z.number(),
    requiresTarget: z.boolean(),
  }),
  z.object({
    type: z.literal('fireball'),
    potency: z.number(),
    radius: z.number(),
    requiresTarget: z.boolean(),
  }),
  z.object({
    type: z.literal('revealMap'),
    requiresTarget: z.boolean(),
  }),
  z.object({
    type: z.literal('applyStatus'),
    status: z.literal('poison'),
    duration: z.number(),
    potency: z.number(),
    requiresTarget: z.boolean(),
  }),
  z.object({
    type: z.literal('identify'),
    requiresTarget: z.boolean(),
  }),
]);

export const AiSchema = z.object({
  state: z.enum(['idle', 'wander', 'chase', 'flee', 'patrol']),
  canPassThroughWalls: z.boolean().optional(),
  fleeThreshold: z.number().optional(),
  patrolPoints: z.array(PointSchema).optional(),
  currentPatrolIndex: z.number().optional(),
});
