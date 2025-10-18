import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { loadResources, clearResources } from '../../engine/resourceManager.js';
import { loadWorldData } from '../../engine/worldManager.js';
import { createInitialGameState } from '../initialState.js';

describe('World Data Integration Test', () => {
  beforeAll(async () => {
    // Load all the actual game data from the data directory
    await loadResources(['./data', './assets']);
    loadWorldData();
  });

  afterAll(() => {
    // Clear the resource cache after the test
    clearResources();
  });

  it('should create the initial game state using real data without errors', () => {
    // The main assertion is that this function does not throw an error.
    // If any data is inconsistent (e.g., a theme is missing, a prefab ID is wrong),
    // this function will throw, and the test will fail.
    expect(() => {
      createInitialGameState();
    }).not.toThrow();
  });
});
