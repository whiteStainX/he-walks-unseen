import { getResource } from './resourceManager.js';
import { nanoid } from 'nanoid';
import type { Entity, DefinitionCollection } from './state.js';

type DefinitionSource = DefinitionCollection | Array<Record<string, any>>;

function getDefinition(source: DefinitionSource | undefined, id: string) {
  if (!source) return undefined;
  if (Array.isArray(source)) {
    return source.find((definition) => definition.id === id);
  }
  return source[id];
}

export function instantiate(id: string): Omit<Entity, 'id' | 'position'> | null {
  const prefabs = getResource<DefinitionSource>('prefabs');
  const items = getResource<DefinitionSource>('items');
  const entities = getResource<DefinitionSource>('entities');

  const definition =
    getDefinition(prefabs, id) ?? getDefinition(items, id) ?? getDefinition(entities, id);

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