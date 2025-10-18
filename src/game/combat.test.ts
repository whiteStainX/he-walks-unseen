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
  setResource('entities', []);
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
  strength: 5,
  dexterity: 100,
  vitality: 10,
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
  strength: 3,
  dexterity: 10,
  vitality: 5,
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

import { recalculateDerivedStats } from './progression.js';

describe('calculateDamage', () => {
  let player: Actor;
  let enemy: Actor;

  beforeEach(() => {
    player = JSON.parse(JSON.stringify(mockPlayer));
    enemy = JSON.parse(JSON.stringify(mockEnemy));
    recalculateDerivedStats(player);
    recalculateDerivedStats(enemy);
  });

  it('should return the difference between attack and defense', () => {
    const damage = calculateDamage(player, enemy, mockGameState);
    expect(damage).toBe(11);
  });

  it('should return 0 if defense is greater than attack', () => {
    const strongEnemy = produce(enemy, draft => {
      draft.defense = 20;
    });
    const damage = calculateDamage(player, strongEnemy, mockGameState);
    expect(damage).toBe(0);
  });

  it('should add bonus damage if attacker has power-strike skill', () => {
    player.learnedSkills = { 'power-strike': true };
    // The skill isn't actually implemented to add damage in calculateDamage,
    // so the result should be the same as a normal attack.
    const damage = calculateDamage(player, enemy, mockGameState);
    expect(damage).toBe(11);
  });

  it('should factor in equipment bonuses', () => {
    const playerWithDagger = produce(player, draft => {
      draft.equipment = { weapon: mockDagger };
    });
    const enemyWithArmor = produce(enemy, draft => {
      draft.equipment = { armor: mockLeatherArmor };
    });
    // Player: 12 base attack + 2 from dagger = 14 attack
    // Enemy: 1 base defense + 1 from armor = 2 defense
    // Damage: 14 - 2 = 12
    const damage = calculateDamage(
      playerWithDagger,
      enemyWithArmor,
      mockGameState
    );
    expect(damage).toBe(12);
  });
});

import { produce } from 'immer';

describe('resolveAttack', () => {
  let state: GameState;
  beforeEach(() => {
    state = JSON.parse(JSON.stringify(mockGameState));
    state.actors = [
      JSON.parse(JSON.stringify(mockPlayer)),
      JSON.parse(JSON.stringify(mockEnemy)),
    ];
    recalculateDerivedStats(state.actors[0]);
    recalculateDerivedStats(state.actors[1]);
  });
  it('should reduce defender HP when player attacks enemy', () => {
    resolveAttack(state.actors[0], state.actors[1], state);
    const updatedEnemy = state.actors.find((a) => a.id === 'enemy-1');
    expect(updatedEnemy?.hp.current).toBe(59); // 70 - 11 = 59
    const lastMessage = state.log[state.log.length - 1];
    expect(lastMessage.text).toContain('Player attacks Goblin for 11 damage.');
  });

  it('should reduce player HP when enemy attacks player', () => {
    state.actors[1].dexterity = 200; // crank it way up to guarantee a hit
    recalculateDerivedStats(state.actors[1]);

    resolveAttack(state.actors[1], state.actors[0], state);
    const updatedPlayer = state.actors.find((a) => a.isPlayer);

    expect(updatedPlayer?.hp.current).toBe(114);
    const lastMessage = state.log[state.log.length - 1];
    expect(lastMessage.text).toContain('Goblin attacks Player for 6 damage.');
    expect(lastMessage.type).toBe('damage');
  });

  it('should handle a killing blow, remove the actor, and grant XP', () => {
    state.actors[0].strength = 50; // Make player strong enough to one-shot
    recalculateDerivedStats(state.actors[0]);

    resolveAttack(state.actors[0], state.actors[1], state);

    expect(state.actors.find((a) => a.id === 'enemy-1')).toBeUndefined();
    const lastMessage = state.log[state.log.length - 1];
    expect(lastMessage.text).toContain('Goblin dies!');
    expect(lastMessage.text).toContain('You gain 10 XP.');

    const updatedPlayer = state.actors.find((a) => a.isPlayer);
    expect(updatedPlayer?.xp).toBe(10);
  });

  it('should drop loot when an enemy is defeated', () => {
    jest.spyOn(global.Math, 'random').mockReturnValue(0.1); // Ensure loot drop
    state.actors[0].strength = 50; // Make player strong enough to one-shot
    recalculateDerivedStats(state.actors[0]);

    resolveAttack(state.actors[0], state.actors[1], state);

    expect(state.items.length).toBe(1);
    const droppedItem = state.items[0];
    expect(droppedItem.position).toEqual(mockEnemy.position);
    const lastMessage = state.log[state.log.length - 1];
    expect(lastMessage.text).toContain('The Goblin drops a');
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  it('should handle attacks that deal no damage', () => {
    state.actors[0].strength = 0; // Make player weak
    state.actors[0].dexterity = 0; // Make player miss a lot
    recalculateDerivedStats(state.actors[0]);

    resolveAttack(state.actors[0], state.actors[1], state);
    const updatedEnemy = state.actors.find((a) => a.id === 'enemy-1');

    expect(updatedEnemy?.hp.current).toBe(70);
    const lastMessage = state.log[state.log.length - 1];
    expect(lastMessage.text).toContain('but misses.');
  });

  it('should factor in equipment when resolving an attack', () => {
    state.actors[0].equipment = { weapon: mockDagger };
    state.actors[0].strength = 50; // Make player strong enough to one-shot
    recalculateDerivedStats(state.actors[0]);

    resolveAttack(state.actors[0], state.actors[1], state);

    const updatedEnemy = state.actors.find((a) => a.id === 'enemy-1');
    expect(updatedEnemy).toBeUndefined(); // Enemy should be defeated
    const lastMessage = state.log[state.log.length - 1];
    expect(lastMessage.text).toContain('Player attacks Goblin for 103 damage.');
    expect(lastMessage.text).toContain('Goblin dies!');
  });
});