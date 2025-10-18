import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { GameState, Actor, StatusEffect, Item } from '../engine/state.js';
import { processStatusEffects } from './statusEffects.js';
import { resolveAttack } from './combat.js';
import { recalculateDerivedStats } from './progression.js';

import { produce } from 'immer';

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
    strength: 5,
    dexterity: 100,
    vitality: 10,
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
    strength: 3,
    dexterity: 10,
    vitality: 5,
  };

  beforeEach(() => {
    const freshPlayer = JSON.parse(JSON.stringify(player));
    const freshEnemy = JSON.parse(JSON.stringify(enemy));

    recalculateDerivedStats(freshPlayer);
    recalculateDerivedStats(freshEnemy);

    mockState = {
      phase: 'PlayerTurn',
      actors: [freshPlayer, freshEnemy],
      items: [],
      entities: [],
      map: { tiles: [], width: 10, height: 10 },
      log: [],
      logOffset: 0,
      visibleTiles: new Set(),
      exploredTiles: new Set(),
      currentMapId: 'testMap',
      mapStates: new Map(),
      activeTheme: 'amber',
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

      const nextState = produce(mockState, (draft) => {
        processStatusEffects(draft);
      });
      const updatedPlayer = nextState.actors.find((a) => a.id === 'player');

      expect(updatedPlayer?.hp.current).toBe(119);
      expect(updatedPlayer?.statusEffects?.[0]?.duration).toBe(2);
      expect(
        nextState.log.some((m) => m.text.includes('Player takes 1 poison damage.'))
      ).toBe(true);
    });

    it('should remove an effect when its duration expires', () => {
      const poisonEffect: StatusEffect = {
        id: 'poison-1',
        type: 'poison',
        duration: 1,
        potency: 1,
      };
      mockState.actors[0].statusEffects = [poisonEffect];

      const nextState = produce(mockState, (draft) => {
        processStatusEffects(draft);
      });
      const updatedPlayer = nextState.actors.find((a) => a.id === 'player');

      expect(updatedPlayer?.hp.current).toBe(119);
      expect(updatedPlayer?.statusEffects?.length).toBe(0);
      expect(
        nextState.log.some((m) => m.text.includes('Player is no longer poisoned.'))
      ).toBe(true);
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

      const nextState = produce(mockState, (draft) => {
        processStatusEffects(draft);
      });
      const deadEnemy = nextState.actors.find((a) => a.id === 'enemy-1');

      expect(deadEnemy).toBeUndefined();
      expect(nextState.actors.length).toBe(1);
      expect(
        nextState.log.some((m) => m.text.includes('Goblin dies from the poison!'))
      ).toBe(true);
    });
  });

  describe('Combat Integration', () => {
    const mockPoisonDagger: Item = {
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
    };

    it('should apply a status effect from a weapon on a successful hit', () => {
      // Mock random to always succeed the chance roll
      jest.spyOn(global.Math, 'random').mockReturnValue(0.4);

      const attacker = mockState.actors[1];
      const defender = mockState.actors[0];

      attacker.dexterity = 200; // Crank it up to guarantee a hit
      attacker.equipment = {
        weapon: mockPoisonDagger,
      };
      recalculateDerivedStats(attacker);

      resolveAttack(attacker, defender, mockState);
      const updatedPlayer = mockState.actors.find((a) => a.isPlayer);

      expect(updatedPlayer?.statusEffects?.length).toBe(1);
      expect(updatedPlayer?.statusEffects?.[0].type).toBe('poison');
      const lastMessage = mockState.log[mockState.log.length - 1];
      expect(lastMessage.text).toContain('The Player is poisoned!');

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
      const nextState = produce(mockState, (draft) => {
        resolveAttack(attackerWithPoisonWeapon, player, draft);
      });
      const updatedPlayer = nextState.actors.find((a) => a.isPlayer);

      expect(updatedPlayer?.statusEffects?.length).toBe(0);
      const lastMessage = nextState.log[nextState.log.length - 1];
      expect(lastMessage.text).not.toContain('The Player is poisoned!');

      // Restore mock
      jest.spyOn(global.Math, 'random').mockRestore();
    });
  });
});