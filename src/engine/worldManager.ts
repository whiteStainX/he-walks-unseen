import { getResource } from './resourceManager.js';
import { WorldSchema } from './schemas/world.js';
import type { z } from 'zod';

type WorldData = z.infer<typeof WorldSchema>;
export type MapDefinition = WorldData['maps'][0];

let worldData: WorldData | null = null;

export function loadWorldData(): void | never {
  const data = getResource<unknown>('world');
  const validationResult = WorldSchema.safeParse(data);

  if (!validationResult.success) {
    console.error('Failed to validate world data:', validationResult.error.errors);
    throw new Error('Invalid world data format');
  }

  worldData = validationResult.data;
}

export function getMapDefinition(mapId: string): MapDefinition | undefined {
  if (!worldData) {
    throw new Error('World data not loaded');
  }
  return worldData.maps.find((map) => map.id === mapId);
}

export function getStartMapId(): string {
  if (!worldData) {
    throw new Error('World data not loaded');
  }
  return worldData.startMapId;
}
