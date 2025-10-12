import { z } from 'zod';
import { AiSchema, BaseEntitySchema, HpSchema, ItemEffectSchema } from './common.js';

export const EnemySchema = BaseEntitySchema.extend({
  id: z.string(),
  hp: HpSchema,
  attack: z.number(),
  defense: z.number(),
  xpValue: z.number().optional(),
  xp: z.number().optional(),
  ai: AiSchema,
  loot: z.string().optional(),
  equipment: z
    .object({
      weapon: z.string().optional(),
      armor: z.string().optional(),
    })
    .optional(),
  effects: z.array(ItemEffectSchema).optional(),
});

export const EnemyCollectionSchema = z.array(EnemySchema);
