import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { produce } from 'immer';
import { processEnemyTurns } from './enemyTurns.js';
import type { Actor, GameState, Tile } from '../../engine/state.js';

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

  beforeAll(() => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1);
  });

  afterAll(() => {
    randomSpy.mockRestore();
  });

  it('should return to the combat menu after enemies finish acting', () => {
    const state: GameState = {
      ...baseState,
      actors: [player, enemy],
      combatTargetId: 'enemy',
    };

    const nextState = produce(state, (draft) => {
      processEnemyTurns(draft);
    });

    expect(nextState.phase).toBe('CombatMenu');
    const updatedPlayer = nextState.actors.find((actor) => actor.id === 'player');
    expect(updatedPlayer?.actionPoints?.current).toBe(updatedPlayer?.actionPoints?.max);
    const updatedEnemy = nextState.actors.find((actor) => actor.id === 'enemy');
    expect(updatedEnemy?.actionPoints?.current).toBe(0);
  });

  it('should transition back to player turn when not in combat', () => {
    const roamingEnemy: Actor = { ...enemy, position: { x: 3, y: 1 } };
    const state: GameState = {
      ...baseState,
      actors: [player, roamingEnemy],
    };

    const nextState = produce(state, (draft) => {
      processEnemyTurns(draft);
    });

    expect(nextState.phase).toBe('PlayerTurn');
  });
});
