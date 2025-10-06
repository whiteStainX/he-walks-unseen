import { equip, getActorStats, unequip } from './equipment.js';
import type { Actor, GameState, Item } from '../engine/state.js';

const mockPlayer: Actor = {
  id: 'player',
  name: 'Player',
  char: '@',
  position: { x: 1, y: 1 },
  hp: { current: 10, max: 10 },
  attack: 5,
  defense: 2,
  isPlayer: true,
  inventory: [],
  equipment: {},
};

const mockGameState: GameState = {
  phase: 'PlayerTurn',
  actors: [mockPlayer],
  items: [],
  entities: [],
  map: { tiles: [], width: 10, height: 10 },
  log: [],
  logOffset: 0,
  visibleTiles: new Set(),
  exploredTiles: new Set(),
  currentFloor: 1,
  floorStates: new Map(),
};

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

describe('getActorStats', () => {
  it('should return base stats if no equipment is worn', () => {
    const stats = getActorStats(mockPlayer);
    expect(stats.attack).toBe(5);
    expect(stats.defense).toBe(2);
  });

  it('should include bonuses from a weapon', () => {
    const playerWithDagger: Actor = {
      ...mockPlayer,
      equipment: { weapon: mockDagger },
    };
    const stats = getActorStats(playerWithDagger);
    expect(stats.attack).toBe(7);
    expect(stats.defense).toBe(2);
  });

  it('should include bonuses from armor', () => {
    const playerWithArmor: Actor = {
      ...mockPlayer,
      equipment: { armor: mockLeatherArmor },
    };
    const stats = getActorStats(playerWithArmor);
    expect(stats.attack).toBe(5);
    expect(stats.defense).toBe(3);
  });

  it('should include bonuses from multiple items', () => {
    const playerWithGear: Actor = {
      ...mockPlayer,
      equipment: { weapon: mockDagger, armor: mockLeatherArmor },
    };
    const stats = getActorStats(playerWithGear);
    expect(stats.attack).toBe(7);
    expect(stats.defense).toBe(3);
  });
});

describe('equip', () => {
  it('should move an item from inventory to an equipment slot', () => {
    const playerWithDaggerInInv: Actor = {
      ...mockPlayer,
      inventory: [mockDagger],
    };
    const stateWithItem = {
      ...mockGameState,
      actors: [playerWithDaggerInInv],
    };

    const newState = equip(stateWithItem, 'player', 'dagger-1');
    const newPlayer = newState.actors[0];

    expect(newPlayer.inventory).toHaveLength(0);
    expect(newPlayer.equipment?.weapon).toBe(mockDagger);
    const lastMessage = newState.log[newState.log.length - 1];
    expect(lastMessage.text).toBe('You equipped the Dagger.');
  });

  it('should swap an equipped item back to inventory', () => {
    const oldDagger: Item = { ...mockDagger, id: 'old-dagger', name: 'Old Dagger' };
    const playerWithOldDaggerEquipped: Actor = {
      ...mockPlayer,
      inventory: [mockDagger],
      equipment: { weapon: oldDagger },
    };
    const stateWithItem = {
      ...mockGameState,
      actors: [playerWithOldDaggerEquipped],
    };

    const newState = equip(stateWithItem, 'player', 'dagger-1');
    const newPlayer = newState.actors[0];

    expect(newPlayer.equipment?.weapon).toBe(mockDagger);
    expect(newPlayer.inventory).toHaveLength(1);
    expect(newPlayer.inventory?.[0]).toBe(oldDagger);
  });
});

describe('unequip', () => {
  it('should move an item from an equipment slot to inventory', () => {
    const playerWithDaggerEquipped: Actor = {
      ...mockPlayer,
      equipment: { weapon: mockDagger },
    };
    const stateWithEquippedItem = {
      ...mockGameState,
      actors: [playerWithDaggerEquipped],
    };

    const newState = unequip(stateWithEquippedItem, 'player', 'weapon');
    const newPlayer = newState.actors[0];

    expect(newPlayer.equipment?.weapon).toBeUndefined();
    expect(newPlayer.inventory).toHaveLength(1);
    expect(newPlayer.inventory?.[0]).toBe(mockDagger);
    const lastMessage = newState.log[newState.log.length - 1];
    expect(lastMessage.text).toBe('You unequipped the Dagger.');
  });
});