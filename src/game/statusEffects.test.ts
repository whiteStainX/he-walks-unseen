import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { GameState, Actor, StatusEffect } from '../engine/state.js';
import { processStatusEffects } from './statusEffects.js';
import { resolveAttack } from './combat.js';

describe('Status Effects System', () => {
  let mockState: GameState;
  const player: Actor = {
    id: 'player',
    isPlayer: true,
    name: 'Player',
    char: '@',
    position: { x: 1, y: 1 },
    hp: { current: 10, max: 10 },
    attack: 2,
    defense: 1,
    statusEffects: [],
  };

  const enemy: Actor = {
    id: 'enemy-1',
    name: 'Goblin',
    char: 'g',
    position: { x: 2, y: 1 },
    hp: { current: 5, max: 5 },
    attack: 1,
    defense: 0,
    statusEffects: [],
  };

  beforeEach(() => {
    mockState = {
      phase: 'PlayerTurn',
      actors: [
        { ...player, hp: { ...player.hp, current: 10 }, statusEffects: [] },
        { ...enemy, hp: { ...enemy.hp, current: 5 }, statusEffects: [] },
      ],
      items: [],
      entities: [],
      map: { tiles: [], width: 10, height: 10 },
      message: '',
      messageType: 'info',
      visibleTiles: new Set(),
      exploredTiles: new Set(),
      currentFloor: 1,
      floorStates: new Map(),
    };
  });

  describe('processStatusEffects', () => {
    it('should apply poison damage to an actor', () => {
      const poisonEffect: StatusEffect = {
        id: 'poison-1',
        type: 'poison',
        duration: 3,
        potency: 1,
      };
      mockState.actors[0].statusEffects = [poisonEffect];

      const newState = processStatusEffects(mockState);
      const updatedPlayer = newState.actors.find((a) => a.id === 'player');

      expect(updatedPlayer?.hp.current).toBe(9);
      expect(updatedPlayer?.statusEffects?.[0]?.duration).toBe(2);
      expect(newState.message).toContain('Player takes 1 poison damage.');
    });

    it('should remove an effect when its duration expires', () => {
      const poisonEffect: StatusEffect = {
        id: 'poison-1',
        type: 'poison',
        duration: 1,
        potency: 1,
      };
      mockState.actors[0].statusEffects = [poisonEffect];

      const newState = processStatusEffects(mockState);
      const updatedPlayer = newState.actors.find((a) => a.id === 'player');

      expect(updatedPlayer?.hp.current).toBe(9);
      expect(updatedPlayer?.statusEffects?.length).toBe(0);
      expect(newState.message).toContain('Player is no longer poisoned.');
    });

    it('should handle actors dying from status effects', () => {
      const poisonEffect: StatusEffect = {
        id: 'poison-1',
        type: 'poison',
        duration: 3,
        potency: 1,
      };
      mockState.actors[1].hp.current = 1; // Enemy has 1 HP left
      mockState.actors[1].statusEffects = [poisonEffect];

      const newState = processStatusEffects(mockState);
      const deadEnemy = newState.actors.find((a) => a.id === 'enemy-1');

      expect(deadEnemy).toBeUndefined();
      expect(newState.actors.length).toBe(1);
      expect(newState.message).toContain('Goblin dies from the poison!');
    });
  });

  describe('Combat Integration', () => {
    it('should apply a status effect from a weapon on a successful hit', () => {
      // Mock random to always succeed the chance roll
      jest.spyOn(global.Math, 'random').mockReturnValue(0.4);

      const attackerWithPoisonWeapon: Actor = {
        ...enemy,
        equipment: {
          weapon: {
            id: 'poison-dagger',
            name: 'Poison Dagger',
            char: ')',
            position: { x: -1, y: -1 },
            equipment: {
              slot: 'weapon',
              bonuses: { attack: 1 },
              onHit: {
                type: 'poison',
                duration: 3,
                potency: 1,
                chance: 0.5,
              },
            },
          },
        },
      };

      mockState.actors[1] = attackerWithPoisonWeapon;
      const stateAfterAttack = resolveAttack(attackerWithPoisonWeapon, player, mockState);
      const updatedPlayer = stateAfterAttack.actors.find((a) => a.isPlayer);

      expect(updatedPlayer?.statusEffects?.length).toBe(1);
      expect(updatedPlayer?.statusEffects?.[0].type).toBe('poison');
      expect(stateAfterAttack.message).toContain('The Player is poisoned!');

      // Restore mock
      jest.spyOn(global.Math, 'random').mockRestore();
    });

    it('should not apply a status effect if the chance roll fails', () => {
      // Mock random to always fail the chance roll
      jest.spyOn(global.Math, 'random').mockReturnValue(0.6);

      const attackerWithPoisonWeapon: Actor = {
        ...enemy,
        equipment: {
          weapon: {
            id: 'poison-dagger',
            name: 'Poison Dagger',
            char: ')',
            position: { x: -1, y: -1 },
            equipment: {
              slot: 'weapon',
              bonuses: { attack: 1 },
              onHit: {
                type: 'poison',
                duration: 3,
                potency: 1,
                chance: 0.5,
              },
            },
          },
        },
      };

      mockState.actors[1] = attackerWithPoisonWeapon;
      const stateAfterAttack = resolveAttack(attackerWithPoisonWeapon, player, mockState);
      const updatedPlayer = stateAfterAttack.actors.find((a) => a.isPlayer);

      expect(updatedPlayer?.statusEffects?.length).toBe(0);
      expect(stateAfterAttack.message).not.toContain('The Player is poisoned!');

      // Restore mock
      jest.spyOn(global.Math, 'random').mockRestore();
    });
  });
});