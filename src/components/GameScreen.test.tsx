import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render } from 'ink-testing-library';
import { GameAction } from '../input/actions.js';
import GameScreen, { isActionDefined } from './GameScreen.js';
import { createInitialGameState } from '../game/initialState.js';
import { setResource, clearResources } from '../engine/resourceManager.js';
import { loadWorldData } from '../engine/worldManager.js';

describe('isActionDefined', () => {
  it('treats MOVE_NORTH as a valid action', () => {
    expect(isActionDefined(GameAction.MOVE_NORTH)).toBe(true);
  });

  it('returns false for undefined actions', () => {
    expect(isActionDefined(undefined)).toBe(false);
  });
});

describe('GameScreen', () => {
  beforeEach(() => {
    // Mock resources needed by createInitialGameState
    setResource('world', {
      startMapId: 'keep-1',
      maps: [
        {
          id: 'keep-1',
          width: 80,
          height: 24,
          theme: 'overgrown-keep',
          generator: { type: 'digger' },
          connections: [],
        },
      ],
    });
    loadWorldData();
    setResource('parcels', {}); // Mock parcels to prevent errors in initialState
    setResource('themes', {
      'overgrown-keep': {
        floors: [1],
        map: {
          wall: '#',
          floor: '.',
        },
        enemies: ['goblin'],
        items: ['health-potion', 'dagger'],
      },
    });
    setResource('enemies', [
      {
        id: 'goblin',
        name: 'Goblin',
        char: 'g',
        hp: { current: 5, max: 5 },
        attack: 2,
        defense: 1,
        xpValue: 10,
      },
    ]);
    setResource('items', [
      {
        id: 'health-potion',
        name: 'Health Potion',
        unidentifiedName: 'Bubbling Red Potion',
        identified: false,
      },
      { id: 'dagger', name: 'Dagger' },
    ]);
    setResource('entities', [
      { id: 'door', char: '+' },
      { id: 'chest', char: 'c' },
      { id: 'downstairs', char: '>' },
      { id: 'upstairs', char: '<' },
    ]);
    setResource('prefabs', {
      goblin: {
        name: 'Goblin',
        char: 'g',
        color: 'green',
        hp: { current: 8, max: 8 },
        attack: 4,
        defense: 1,
        xpValue: 15,
        ai: { behavior: 'wander' },
      },
      'health-potion': {
        name: 'Health Potion',
        char: '!',
        color: 'red',
        unidentifiedName: 'Bubbling Red Potion',
        identified: false,
        effects: [
          {
            type: 'heal',
            potency: 10,
            requiresTarget: false,
          },
        ],
      },
    });
  });

  afterEach(() => {
    clearResources();
  });

  it('should render the game screen without crashing', () => {
    const initialState = createInitialGameState();
    const { lastFrame, unmount } = render(
      <GameScreen gameState={initialState} />
    );
    expect(lastFrame()).toContain('Status');
    expect(lastFrame()).toContain('Equipment');
    expect(lastFrame()).toContain('Inventory');
    expect(lastFrame()).toContain('Log');
    // The message might be truncated, so we check for the start of it.
    expect(lastFrame()).toContain('Welcome');
    unmount();
  });

});