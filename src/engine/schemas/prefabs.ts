import { z } from 'zod';
import {
  AiSchema,
  BaseEntitySchema,
  EquipmentSchema,
  HpSchema,
  ItemEffectSchema,
} from './common.js';

export const PrefabSchema = BaseEntitySchema.extend({
  hp: HpSchema.optional(),
  attack: z.number().optional(),
  defense: z.number().optional(),
  xpValue: z.number().optional(),
  xp: z.number().optional(),
  ai: AiSchema.optional(),
  effects: z.array(ItemEffectSchema).optional(),
  equipment: EquipmentSchema.optional(),
  unidentifiedName: z.string().optional(),
  identified: z.boolean().optional(),
  loot: z.string().optional(),
});

export const PrefabCollectionSchema = z.record(PrefabSchema);
