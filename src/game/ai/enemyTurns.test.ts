
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { processEnemyTurns } from './enemyTurns.js';
import type { Actor, GameState, Tile } from '../../engine/state.js';
import { eventBus } from '../../engine/events.js';
import { getCurrentState } from '../../engine/narrativeEngine.js';

jest.mock('../../engine/narrativeEngine.js', () => ({
  getCurrentState: jest.fn(),
}));

describe('processEnemyTurns', () => {
  const createTile = (): Tile => ({ char: '.', walkable: true, transparent: true });

  const baseMap = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => createTile())
  );

  const baseState: GameState = {
    phase: 'EnemyTurn',
    actors: [],
    items: [],
    entities: [],
    map: {
      tiles: baseMap,
      width: 5,
      height: 5,
    },
    log: [],
    logOffset: 0,
    currentMapId: 'testMap',
    mapStates: new Map(),
    visibleTiles: new Set(),
    exploredTiles: new Set(),
    activeTheme: 'amber',
  };

  const player: Actor = {
    id: 'player',
    name: 'Player',
    char: '@',
    position: { x: 1, y: 1 },
    hp: { current: 20, max: 20 },
    attack: 5,
    defense: 2,
    isPlayer: true,
    actionPoints: { current: 0, max: 3 },
    dexterity: 10,
  };

  const enemy: Actor = {
    id: 'enemy',
    name: 'Goblin',
    char: 'g',
    position: { x: 2, y: 1 },
    hp: { current: 5, max: 5 },
    attack: 4,
    defense: 1,
    actionPoints: { current: 0, max: 2 },
    ai: { state: 'chase' },
    dexterity: 10,
  };

  let randomSpy: jest.SpiedFunction<typeof Math.random>;
  let state: GameState;

  beforeAll(() => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1);
    (getCurrentState as jest.Mock).mockImplementation(() => state);
    jest.spyOn(eventBus, 'emit').mockImplementation((event, newState) => {
      state = newState as GameState;
      return true;
    });
  });

  afterAll(() => {
    randomSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('should return to the combat menu after enemies finish acting', async () => {
    state = {
      ...baseState,
      actors: [player, enemy],
      combatTargetId: 'enemy',
    };

    await processEnemyTurns();

    expect(state.phase).toBe('CombatMenu');
    const updatedPlayer = state.actors.find((actor) => actor.id === 'player');
    expect(updatedPlayer?.actionPoints?.current).toBe(updatedPlayer?.actionPoints?.max);
    const updatedEnemy = state.actors.find((actor) => actor.id === 'enemy');
    expect(updatedEnemy?.actionPoints?.current).toBe(0);
  });

  it('should transition back to player turn when not in combat', async () => {
    const roamingEnemy: Actor = { ...enemy, position: { x: 3, y: 1 } };
    state = {
      ...baseState,
      actors: [player, roamingEnemy],
    };

    await processEnemyTurns();

    expect(state.phase).toBe('PlayerTurn');
  });
});
