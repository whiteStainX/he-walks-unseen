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
    effect: 'heal',
    potency: 5,
  },
];

beforeAll(() => {
  setResource('items', mockItems);
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
const mockEnemy: Actor = {
  id: 'enemy-1',
  name: 'Goblin',
  char: 'g',
  position: { x: 2, y: 1 },
  hp: { current: 5, max: 5 },
  attack: 3,
  defense: 1,
  xpValue: 10,
  loot: 'potion-heal',
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
  message: '',
  messageType: 'info',
  currentFloor: 1,
  floorStates: new Map(),
  visibleTiles: new Set<string>(),
  exploredTiles: new Set<string>(),
};

describe('calculateDamage', () => {
  it('should return the difference between attack and defense', () => {
    const damage = calculateDamage(mockPlayer, mockEnemy);
    expect(damage).toBe(4); // 5 attack - 1 defense
  });

  it('should return 0 if defense is greater than attack', () => {
    const strongEnemy = { ...mockEnemy, defense: 10 };
    const damage = calculateDamage(mockPlayer, strongEnemy);
    expect(damage).toBe(0);
  });

  it('should add bonus damage if attacker has power-strike skill', () => {
    const playerWithSkill = {
      ...mockPlayer,
      skills: [{ id: 'power-strike', name: 'Power Strike', description: '' }],
    };
    const damage = calculateDamage(playerWithSkill, mockEnemy);
    expect(damage).toBe(5); // (5 attack + 1 skill) - 1 defense
  });
});

describe('resolveAttack', () => {
  it('should reduce defender HP when player attacks enemy', () => {
    const newState = resolveAttack(mockPlayer, mockEnemy, mockGameState);
    const updatedEnemy = newState.actors.find((a) => a.id === 'enemy-1');

    expect(updatedEnemy?.hp.current).toBe(1); // 5 (base) - (5 (player attack) - 1 (enemy defense)) = 1
    expect(newState.message).toContain('Player attacks Goblin for 4 damage.');
  });

  it('should reduce player HP when enemy attacks player', () => {
    const newState = resolveAttack(mockEnemy, mockPlayer, mockGameState);
    const updatedPlayer = newState.actors.find((a) => a.isPlayer);

    expect(updatedPlayer?.hp.current).toBe(9); // 10 (base) - (3 (enemy attack) - 2 (player defense)) = 9
    expect(newState.message).toContain('Goblin attacks Player for 1 damage.');
    expect(newState.messageType).toBe('damage');
  });

  it('should handle a killing blow, remove the actor, and grant XP', () => {
    const strongPlayer = { ...mockPlayer, attack: 10 };
    const stateWithStrongPlayer = { ...mockGameState, actors: [strongPlayer, mockEnemy] };

    const newState = resolveAttack(strongPlayer, mockEnemy, stateWithStrongPlayer);

    expect(newState.actors.find((a) => a.id === 'enemy-1')).toBeUndefined();
    expect(newState.message).toContain('Goblin dies!');
    expect(newState.message).toContain('You gain 10 XP.');

    const updatedPlayer = newState.actors.find((a) => a.isPlayer);
    expect(updatedPlayer?.xp).toBe(10);
  });

  it('should drop loot when an enemy is defeated', () => {
    const strongPlayer = { ...mockPlayer, attack: 10 };
    const stateWithStrongPlayer = { ...mockGameState, actors: [strongPlayer, mockEnemy] };

    const newState = resolveAttack(strongPlayer, mockEnemy, stateWithStrongPlayer);

    expect(newState.items.length).toBe(1);
    const droppedItem = newState.items[0];
    expect(droppedItem.position).toEqual(mockEnemy.position);
    expect(newState.message).toContain('The Goblin drops a');
  });

  it('should handle attacks that deal no damage', () => {
    const weakPlayer = { ...mockPlayer, attack: 1 };
    const stateWithWeakPlayer = { ...mockGameState, actors: [weakPlayer, mockEnemy] };

    const newState = resolveAttack(weakPlayer, mockEnemy, stateWithWeakPlayer);
    const updatedEnemy = newState.actors.find((a) => a.id === 'enemy-1');

    expect(updatedEnemy?.hp.current).toBe(5);
    expect(newState.message).toContain('but it has no effect.');
  });
});