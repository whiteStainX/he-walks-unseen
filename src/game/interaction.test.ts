import { describe, it, expect } from '@jest/globals';
import type { GameState, Entity } from '../engine/state.js';
import { handleInteraction } from './updateState.js';

const createInitialState = (door: Entity): GameState => ({
  phase: 'PlayerTurn',
  actors: [
    {
      id: 'player',
      name: 'Player',
      char: '@',
      position: { x: 0, y: 0 },
      hp: { current: 10, max: 10 },
      attack: 2,
      defense: 1,
      isPlayer: true,
    },
  ],
  entities: [door],
  items: [],
  map: {
    width: 10,
    height: 10,
    tiles: Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => ({ char: '.', walkable: true, transparent: true }))
    ),
  },
  message: '',
  messageType: 'info',
  currentFloor: 1,
  floorStates: new Map(),
  visibleTiles: new Set<string>(),
  exploredTiles: new Set<string>(),
});

describe('handleInteraction', () => {
  it('should open a closed door', () => {
    const closedDoor: Entity = {
      id: 'door-1',
      name: 'Door',
      char: '+',
      position: { x: 1, y: 0 },
      interaction: { type: 'door', isOpen: false },
    };

    const initialState = createInitialState(closedDoor);

    const newState = handleInteraction(initialState, 1, 0);

    const door = newState.entities.find((e: Entity) => e.id === 'door-1');
    expect(door?.char).toBe('-');
    expect(door?.interaction?.type).toBe('door');
    if (door?.interaction?.type === 'door') {
      expect(door.interaction.isOpen).toBe(true);
    }

    const tile = newState.map.tiles[0][1];
    expect(tile.walkable).toBe(true);
    expect(tile.transparent).toBe(true);
  });

  it('should close an open door', () => {
    const openDoor: Entity = {
      id: 'door-1',
      name: 'Door',
      char: '-',
      position: { x: 1, y: 0 },
      interaction: { type: 'door', isOpen: true },
    };

    const initialState = createInitialState(openDoor);

    const newState = handleInteraction(initialState, 1, 0);

    const door = newState.entities.find((e: Entity) => e.id === 'door-1');
    expect(door?.char).toBe('+');
    expect(door?.interaction?.type).toBe('door');
    if (door?.interaction?.type === 'door') {
      expect(door.interaction.isOpen).toBe(false);
    }

    const tile = newState.map.tiles[0][1];
    expect(tile.walkable).toBe(false);
    expect(tile.transparent).toBe(false);
  });
});
