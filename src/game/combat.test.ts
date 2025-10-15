import { jest } from '@jest/globals';
import { calculateDamage, resolveAttack } from './combat.js';
import {
  setResource,
  clearResources,
} from '../engine/resourceManager.js';
import type { Actor, GameState, Item } from '../engine/state.js';

const mockItems: Partial<Item>[] = [
  {
    id: 'potion-heal',
    name: 'Healing Potion',
    char: '!',
    color: 'red',
    effects: [{ type: 'heal', potency: 5, requiresTarget: false }],
  },
];

beforeAll(() => {
  setResource('items', mockItems);
  setResource('lootTables', {
    'goblin-loot': {
      items: [{ id: 'potion-heal', weight: 100, min: 1, max: 1 }],
    },
  });
  setResource('prefabs', {
    'potion-heal': {
      name: 'Healing Potion',
      char: '!',
      color: 'red',
      effects: [{ type: 'heal', potency: 5, requiresTarget: false }],
    },
  });
  setResource('skills', {
    'power-strike': {
      id: 'power-strike',
      name: 'Power Strike',
      description: 'A powerful attack.',
      effects: [{ type: 'increase_attack', potency: 1, requiresTarget: false }],
    },
  });
});

afterAll(() => {
  clearResources();
});

// A mock player actor for testing
const mockPlayer: Actor = {
  id: 'player',
  name: 'Player',
  char: '@',
  position: { x: 1, y: 1 },
  hp: { current: 10, max: 10 },
  attack: 5,
  defense: 2,
  isPlayer: true,
};

// A mock enemy actor for testing
const mockDagger: Item = {
  id: 'dagger-1',
  name: 'Dagger',
  char: ')',
  position: { x: 0, y: 0 },
  equipment: {
    slot: 'weapon',
    bonuses: { attack: 2 },
  },
};

const mockLeatherArmor: Item = {
  id: 'leather-armor-1',
  name: 'Leather Armor',
  char: '[',
  position: { x: 0, y: 0 },
  equipment: {
    slot: 'armor',
    bonuses: { defense: 1 },
  },
};

const mockEnemy: Actor = {
  id: 'enemy-1',
  name: 'Goblin',
  char: 'g',
  position: { x: 2, y: 1 },
  hp: { current: 5, max: 5 },
  attack: 3,
  defense: 1,
  xpValue: 10,
  lootTableId: 'goblin-loot',
};

// A mock game state for testing
const mockGameState: GameState = {
  phase: 'PlayerTurn',
  actors: [mockPlayer, mockEnemy],
  items: [],
  entities: [],
  map: {
    tiles: [],
    width: 10,
    height: 10,
  },
  log: [],
  logOffset: 0,
  currentMapId: 'testMap',
  mapStates: new Map(),
  visibleTiles: new Set<string>(),
  exploredTiles: new Set<string>(),
  activeTheme: 'amber',
};

describe('calculateDamage', () => {
  it('should return the difference between attack and defense', () => {
    const damage = calculateDamage(mockPlayer, mockEnemy, mockGameState);
    expect(damage).toBe(4); // 5 attack - 1 defense
  });

  it('should return 0 if defense is greater than attack', () => {
    const strongEnemy = { ...mockEnemy, defense: 10 };
    const damage = calculateDamage(mockPlayer, strongEnemy, mockGameState);
    expect(damage).toBe(0);
  });

  it('should add bonus damage if attacker has power-strike skill', () => {
    const playerWithSkill = {
      ...mockPlayer,
      learnedSkills: { 'power-strike': true },
    };
    const damage = calculateDamage(playerWithSkill, mockEnemy, mockGameState);
    expect(damage).toBe(5); // (5 attack + 1 skill) - 1 defense
  });

  it('should factor in equipment bonuses', () => {
    const playerWithDagger: Actor = {
      ...mockPlayer,
      equipment: { weapon: mockDagger },
    };
    const enemyWithArmor: Actor = {
      ...mockEnemy,
      equipment: { armor: mockLeatherArmor },
    };
    // Player: 5 base attack + 2 from dagger = 7 attack
    // Enemy: 1 base defense + 1 from armor = 2 defense
    // Damage: 7 - 2 = 5
    const damage = calculateDamage(
      playerWithDagger,
      enemyWithArmor,
      mockGameState
    );
    expect(damage).toBe(5);
  });
});

import { produce } from 'immer';

describe('resolveAttack', () => {
  it('should reduce defender HP when player attacks enemy', () => {
    const nextState = produce(mockGameState, (draft) => {
      resolveAttack(mockPlayer, mockEnemy, draft);
    });
    const updatedEnemy = nextState.actors.find((a) => a.id === 'enemy-1');

    expect(updatedEnemy?.hp.current).toBe(1); // 5 (base) - (5 (player attack) - 1 (enemy defense)) = 1
    const lastMessage = nextState.log[nextState.log.length - 1];
    expect(lastMessage.text).toContain('Player attacks Goblin for 4 damage.');
  });

  it('should reduce player HP when enemy attacks player', () => {
    const nextState = produce(mockGameState, (draft) => {
      resolveAttack(mockEnemy, mockPlayer, draft);
    });
    const updatedPlayer = nextState.actors.find((a) => a.isPlayer);

    expect(updatedPlayer?.hp.current).toBe(9); // 10 (base) - (3 (enemy attack) - 2 (player defense)) = 9
    const lastMessage = nextState.log[nextState.log.length - 1];
    expect(lastMessage.text).toContain('Goblin attacks Player for 1 damage.');
    expect(lastMessage.type).toBe('damage');
  });

  it('should handle a killing blow, remove the actor, and grant XP', () => {
    const strongPlayer = { ...mockPlayer, attack: 10 };
    const stateWithStrongPlayer = {
      ...mockGameState,
      actors: [strongPlayer, mockEnemy],
    };

    const nextState = produce(stateWithStrongPlayer, (draft) => {
      resolveAttack(strongPlayer, mockEnemy, draft);
    });

    expect(nextState.actors.find((a) => a.id === 'enemy-1')).toBeUndefined();
    const lastMessage = nextState.log[nextState.log.length - 1];
    expect(lastMessage.text).toContain('Goblin dies!');
    expect(lastMessage.text).toContain('You gain 10 XP.');

    const updatedPlayer = nextState.actors.find((a) => a.isPlayer);
    expect(updatedPlayer?.xp).toBe(10);
  });

  it('should drop loot when an enemy is defeated', () => {
    jest.spyOn(global.Math, 'random').mockReturnValue(0.1); // Ensure loot drop
    const strongPlayer = { ...mockPlayer, attack: 10 };
    const stateWithStrongPlayer = {
      ...mockGameState,
      actors: [strongPlayer, mockEnemy],
    };

    const nextState = produce(stateWithStrongPlayer, (draft) => {
      resolveAttack(strongPlayer, mockEnemy, draft);
    });

    expect(nextState.items.length).toBe(1);
    const droppedItem = nextState.items[0];
    expect(droppedItem.position).toEqual(mockEnemy.position);
    const lastMessage = nextState.log[nextState.log.length - 1];
    expect(lastMessage.text).toContain('The Goblin drops a');
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  it('should handle attacks that deal no damage', () => {
    const weakPlayer = { ...mockPlayer, attack: 1 };
    const stateWithWeakPlayer = {
      ...mockGameState,
      actors: [weakPlayer, mockEnemy],
    };

    const nextState = produce(stateWithWeakPlayer, (draft) => {
      resolveAttack(weakPlayer, mockEnemy, draft);
    });
    const updatedEnemy = nextState.actors.find((a) => a.id === 'enemy-1');

    expect(updatedEnemy?.hp.current).toBe(5);
    const lastMessage = nextState.log[nextState.log.length - 1];
    expect(lastMessage.text).toContain('but it has no effect.');
  });

  it('should factor in equipment when resolving an attack', () => {
    const playerWithDagger: Actor = {
      ...mockPlayer,
      equipment: { weapon: mockDagger },
    };
    const stateWithEquippedPlayer = {
      ...mockGameState,
      actors: [playerWithDagger, mockEnemy],
    };
    const nextState = produce(stateWithEquippedPlayer, (draft) => {
      resolveAttack(playerWithDagger, mockEnemy, draft);
    });

    // Player attack: 5 + 2 = 7
    // Enemy defense: 1
    // Damage: 7 - 1 = 6
    // Enemy HP: 5 - 6 = -1
    const updatedEnemy = nextState.actors.find((a) => a.id === 'enemy-1');
    expect(updatedEnemy).toBeUndefined(); // Enemy should be defeated
    const lastMessage = nextState.log[nextState.log.length - 1];
    expect(lastMessage.text).toContain('Player attacks Goblin for 6 damage.');
    expect(lastMessage.text).toContain('Goblin dies!');
  });
});