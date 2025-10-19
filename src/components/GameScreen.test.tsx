import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { render } from 'ink-testing-library';
import { GameAction } from '../input/actions.js';
import GameScreen, { isActionDefined } from './GameScreen.js';
import { createInitialGameState } from '../game/initialState.js';
import type { Actor } from '../engine/state.js';
import { setResource, clearResources } from '../engine/resourceManager.js';
import { loadWorldData } from '../engine/worldManager.js';

// Mock the PlayerExpressionManager component to avoid async issues with timers
jest.mock('./PlayerExpressionManager.js', () => ({
  __esModule: true,
  default: () => null, // Render nothing
}));

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
    setResource('skills', {}); // Mock skills to prevent errors
    setResource('environmentThemes', {
      'overgrown-keep': {
        map: {
          wall: '#',
          floor: '.',
        },
      },
    });
    setResource('combatActions', {
      attack: { id: 'attack', name: 'Attack', apCost: 1 },
      defend: { id: 'defend', name: 'Defend', apCost: 1 },
      flee: { id: 'flee', name: 'Flee', apCost: 1 },
      cancel: { id: 'cancel', name: 'Cancel', apCost: 0 },
    });
    setResource('player_idle', 'player_idle');
    setResource('profiles', { 'player_idle': 'player_idle' });
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
      player: {
        name: 'Player',
        char: '@',
        hp: { current: 10, max: 10 },
        attack: 5,
        defense: 2,
        isPlayer: true,
      },
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

  it('keeps combat views visible during the enemy turn when combat is active', () => {
    const state = createInitialGameState();
    const player = state.actors.find((actor) => actor.isPlayer);
    expect(player).toBeDefined();
    if (!player) {
      throw new Error('Player not found in game state');
    }

    player.actionPoints = { current: 0, max: 3 };

    const enemy: Actor = {
      id: 'enemy-1',
      name: 'Goblin',
      char: 'g',
      position: { x: player.position.x + 1, y: player.position.y },
      hp: { current: 5, max: 5 },
      attack: 3,
      defense: 1,
    };

    state.actors.push(enemy);
    state.combatTargetId = enemy.id;
    state.selectedCombatMenuIndex = 0;
    state.phase = 'EnemyTurn';

    const { lastFrame, unmount } = render(
      <GameScreen gameState={state} />
    );

    const frame = lastFrame();
    expect(frame).toContain('Engaging: Goblin');
    expect(frame).toContain('Enemy is taking actions...');

    unmount();
  });

});
