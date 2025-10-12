import type { z } from 'zod';
import {
  EnemyCollectionSchema,
  EntityCollectionSchema,
  ItemCollectionSchema,
  MapCollectionSchema,
  ParcelCollectionSchema,
  PrefabCollectionSchema,
  ThemeCollectionSchema,
  WorldSchema,
} from './schemas/index.js';

export interface ResourceDescriptor<T> {
  schema: z.ZodType<T>;
  transform?: (value: T) => T;
}

function harmonizeXpValue<T extends { xp?: number; xpValue?: number }>(value: T): T {
  if (value.xpValue === undefined && value.xp !== undefined) {
    const { xp, ...rest } = value;
    return { ...rest, xpValue: value.xp } as T;
  }

  if ('xp' in value) {
    const { xp, ...rest } = value;
    return rest as T;
  }

  return value;
}

function harmonizePrefabCollection(
  collection: z.infer<typeof PrefabCollectionSchema>
): z.infer<typeof PrefabCollectionSchema> {
  return Object.fromEntries(
    Object.entries(collection).map(([key, prefab]) => [
      key,
      harmonizeXpValue(prefab),
    ])
  );
}

function harmonizeEnemyCollection(
  collection: z.infer<typeof EnemyCollectionSchema>
): z.infer<typeof EnemyCollectionSchema> {
  return collection.map((enemy) => harmonizeXpValue(enemy));
}

export const DEFAULT_RESOURCE_DESCRIPTORS: Record<string, ResourceDescriptor<any>> = {
  world: { schema: WorldSchema },
  themes: { schema: ThemeCollectionSchema },
  prefabs: {
    schema: PrefabCollectionSchema,
    transform: harmonizePrefabCollection,
  },
  entities: { schema: EntityCollectionSchema },
  items: { schema: ItemCollectionSchema },
  enemies: {
    schema: EnemyCollectionSchema,
    transform: harmonizeEnemyCollection,
  },
  parcels: { schema: ParcelCollectionSchema },
  maps: { schema: MapCollectionSchema },
};
