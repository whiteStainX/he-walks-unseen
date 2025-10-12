import { z } from 'zod';
import { BaseEntitySchema, EquipmentSchema, ItemEffectSchema } from './common.js';

export const ItemSchema = BaseEntitySchema.extend({
  id: z.string(),
  effects: z.array(ItemEffectSchema).optional(),
  equipment: EquipmentSchema.optional(),
  unidentifiedName: z.string().optional(),
  identified: z.boolean().optional(),
});

export const ItemCollectionSchema = z.array(ItemSchema);
