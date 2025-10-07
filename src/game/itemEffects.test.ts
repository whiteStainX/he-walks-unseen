
import type { GameState, Actor } from '../engine/state.js';
import { applyEffect } from './itemEffects.js';

const createMockPlayer = (overrides: Partial<Actor> = {}): Actor => ({
  id: 'player',
  name: 'Player',
  char: '@',
  position: { x: 1, y: 1 },
  hp: { current: 10, max: 20 },
  attack: 5,
  defense: 5,
  isPlayer: true,
  inventory: [],
  ...overrides,
});

const createMockEnemy = (overrides: Partial<Actor> = {}): Actor => ({
  id: 'enemy',
  name: 'Enemy',
  char: 'e',
  position: { x: 5, y: 5 },
  hp: { current: 10, max: 10 },
  attack: 3,
  defense: 1,
  inventory: [],
  ...overrides,
});

const createMockState = (overrides: Partial<GameState> = {}): GameState => {
    const player = createMockPlayer();
    const actors = [player];

    return {
        phase: 'PlayerTurn',
        actors,
        items: [],
        entities: [],
        map: {
            tiles: Array(10).fill(0).map(() => Array(10).fill({ char: '.', walkable: true, transparent: true })),
            width: 10,
            height: 10,
        },
        log: [],
        logOffset: 0,
        visibleTiles: new Set<string>(),
        exploredTiles: new Set<string>(),
        currentMapId: 'testMap',
        mapStates: new Map(),
        ...overrides,
    };
};

import { produce } from 'immer';

describe('applyEffect', () => {
  it('should heal the user', () => {
    const player = createMockPlayer({ hp: { current: 5, max: 20 } });
    const state = createMockState({ actors: [player] });
    const healEffect = { type: 'heal' as const, potency: 10, requiresTarget: false };

    const nextState = produce(state, (draft) => {
      applyEffect(player, draft, healEffect);
    });
    const updatedPlayer = nextState.actors.find((a) => a.isPlayer)!;

    expect(updatedPlayer.hp.current).toBe(15);
    const lastMessage = nextState.log[nextState.log.length - 1];
    expect(lastMessage.text).toContain('heals for 10 HP');
  });

  it('should not heal beyond max HP', () => {
    const player = createMockPlayer({ hp: { current: 18, max: 20 } });
    const state = createMockState({ actors: [player] });
    const healEffect = { type: 'heal' as const, potency: 10, requiresTarget: false };

    const nextState = produce(state, (draft) => {
      applyEffect(player, draft, healEffect);
    });
    const updatedPlayer = nextState.actors.find((a) => a.isPlayer)!;

    expect(updatedPlayer.hp.current).toBe(20);
    const lastMessage = nextState.log[nextState.log.length - 1];
    expect(lastMessage.text).toContain('heals for 2 HP');
  });

  it('should damage a target', () => {
    const player = createMockPlayer();
    const enemy = createMockEnemy({ id: 'enemy', name: 'Enemy', position: { x: 2, y: 1 } });
    const state = createMockState({ actors: [player, enemy] });
    const damageEffect = { type: 'damage' as const, potency: 5, requiresTarget: true };

    const nextState = produce(state, (draft) => {
      applyEffect(player, draft, damageEffect, enemy.position);
    });
    const updatedEnemy = nextState.actors.find((a) => a.id === 'enemy')!;

    expect(updatedEnemy.hp.current).toBe(5);
    const lastMessage = nextState.log[nextState.log.length - 1];
    expect(lastMessage.text).toContain('takes 5 damage');
  });

  it('should apply a fireball effect to multiple actors in a radius', () => {
    const player = createMockPlayer();
    const enemy1 = createMockEnemy({ id: 'enemy1', name: 'Enemy1', position: { x: 3, y: 3 } });
    const enemy2 = createMockEnemy({ id: 'enemy2', name: 'Enemy2', position: { x: 4, y: 4 } });
    const enemy3 = createMockEnemy({ id: 'enemy3', name: 'Enemy3', position: { x: 8, y: 8 } }); // Out of radius
    const state = createMockState({ actors: [player, enemy1, enemy2, enemy3] });
    const fireballEffect = { type: 'fireball' as const, potency: 8, radius: 3, requiresTarget: true };
    const targetPoint = { x: 2, y: 2 };

    const nextState = produce(state, (draft) => {
      applyEffect(player, draft, fireballEffect, targetPoint);
    });

    const updatedEnemy1 = nextState.actors.find((a) => a.id === 'enemy1')!;
    const updatedEnemy2 = nextState.actors.find((a) => a.id === 'enemy2')!;
    const updatedEnemy3 = nextState.actors.find((a) => a.id === 'enemy3')!;

    expect(updatedEnemy1.hp.current).toBe(2); // 10 - 8
    expect(updatedEnemy2.hp.current).toBe(2); // 10 - 8
    expect(updatedEnemy3.hp.current).toBe(10); // Unchanged
    const lastMessage = nextState.log[nextState.log.length - 1];
    expect(lastMessage.text).toContain('A fireball explodes');
  });

  it('should reveal the entire map', () => {
    const player = createMockPlayer();
    const state = createMockState({
        actors: [player],
        map: {
            tiles: Array(5).fill(0).map(() => Array(5).fill({ char: '.', walkable: true, transparent: true })),
            width: 5,
            height: 5,
        },
        exploredTiles: new Set(['0,0']),
    });
    const revealMapEffect = { type: 'revealMap' as const, requiresTarget: false };

    const nextState = produce(state, (draft) => {
      applyEffect(player, draft, revealMapEffect);
    });

    expect(nextState.exploredTiles.size).toBe(25); // 5x5 grid
    const lastMessage = nextState.log[nextState.log.length - 1];
    expect(lastMessage.text).toContain('reveals the entire map');
  });
});