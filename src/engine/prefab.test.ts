import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { instantiate } from './prefab.js';
import { clearResources, setResource } from './resourceManager.js';

describe('instantiate', () => {
  beforeEach(() => {
    setResource('prefabs', {});
    setResource('items', {});
    setResource('entities', [
      {
        id: 'chest',
        name: 'Chest',
        char: 'C',
        states: { default: 'C' },
        interaction: { type: 'chest', isLooted: false, lootTableId: 'basic' },
      },
    ]);
  });

  afterEach(() => {
    clearResources();
  });

  it('instantiates entities defined in array resources', () => {
    const result = instantiate('chest');

    expect(result).not.toBeNull();
    expect(result?.name).toBe('Chest');
    expect(result?.char).toBe('C');
    expect(result?.interaction?.type).toBe('chest');
    const entity = result as Record<string, unknown> | null;
    expect(entity && (entity.id as string)).not.toBe('chest');
  });
});
