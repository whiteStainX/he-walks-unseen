import { z } from 'zod';
import { BaseEntitySchema } from './common.js';

export const EntityDefinitionSchema = BaseEntitySchema.extend({
  id: z.string(),
});

export const EntityCollectionSchema = z.array(EntityDefinitionSchema);
