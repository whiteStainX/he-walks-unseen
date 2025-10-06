import { getResource } from './resourceManager.js';
import { nanoid } from 'nanoid';
import type { Entity, PrefabCollection } from './state.js';

export function instantiate(prefabId: string): Omit<Entity, 'id' | 'position'> | null {
  const prefabs = getResource<PrefabCollection>('prefabs');
  if (!prefabs || !prefabs[prefabId]) {
    return null;
  }

  const prefab = prefabs[prefabId];

  // Deep copy the prefab to create a new instance
  const newInstance = JSON.parse(JSON.stringify(prefab));

  // Assign a new, unique ID
  newInstance.id = nanoid();

  return newInstance;
}