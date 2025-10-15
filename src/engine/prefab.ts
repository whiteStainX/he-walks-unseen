import { getResource } from './resourceManager.js';
import { nanoid } from 'nanoid';
import type { Entity, DefinitionCollection } from './state.js';

export function instantiate(id: string): Omit<Entity, 'id' | 'position'> | null {
  const prefabs = getResource<DefinitionCollection>('prefabs');
  const items = getResource<DefinitionCollection>('items');
  const entities = getResource<DefinitionCollection>('entities');

  let definition = prefabs[id] ?? items[id] ?? entities[id];

  if (!definition) {
    console.warn(`Definition with id "${id}" not found.`);
    return null;
  }

  // Deep copy the definition to create a new instance
  const newInstance = JSON.parse(JSON.stringify(definition));

  // Assign a new, unique ID
  newInstance.id = nanoid();

  return newInstance;
}