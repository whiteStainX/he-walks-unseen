import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { instantiate } from './prefab.js';
import { setResource, clearResources } from './resourceManager.js';
import type { Actor } from './state.js';

describe('Prefab System', () => {
  beforeAll(() => {
    const prefabs = {
      'goblin-archiver': {
        name: 'Goblin Archiver',
        char: 'g',
        color: 'green',
        hp: { current: 8, max: 8 },
        attack: 4,
        defense: 1,
        xpValue: 15,
        ai: { behavior: 'wander' },
      },
    };
    setResource('prefabs', prefabs);
  });

  afterAll(() => {
    clearResources();
  });

  it('should instantiate a new entity from a prefab', () => {
    const goblin = instantiate('goblin-archiver') as Actor;

    expect(goblin).toBeDefined();
    expect(goblin.name).toBe('Goblin Archiver');
    expect(goblin.id).not.toBe('goblin-archiver'); // Should have a new, unique ID
    expect(goblin.hp.current).toBe(8);
  });

  it('should return null for a non-existent prefab', () => {
    const nonExistent = instantiate('non-existent-prefab');
    expect(nonExistent).toBeNull();
  });
});
