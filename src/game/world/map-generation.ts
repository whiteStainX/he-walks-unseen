import { RNG, Map } from 'rot-js';
import type { Tile } from '../../engine/state.js';
import type { MapDefinition } from '../../engine/worldManager.js';

export type TileMap = Tile[][];

// Helper to get a random integer between min and max (inclusive)
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDiggerMap(
  width: number,
  height: number,
  theme: any
): { map: TileMap; playerStart: { x: number; y: number }; rooms: any[] } {
  // Each time a map is generated, we reset the RNG with a new random seed.
  RNG.setSeed(Date.now() + randomInt(1, 10000));

  const map = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ char: theme.wall, walkable: false, transparent: false }))
  );

  // Use fixed parameters for stable map generation
  const diggerOptions = {
    roomWidth: [3, 9] as [number, number],
    roomHeight: [3, 5] as [number, number],
    corridorLength: [2, 5] as [number, number],
    dugPercentage: 0.8,
  };

  const digger = new Map.Digger(width, height, diggerOptions);
  let playerStart = { x: 0, y: 0 };

  digger.create((x, y, value) => {
    if (value) {
      return;
    }
    map[y][x] = { char: theme.floor, walkable: true, transparent: true };
  });

  const createdRooms = digger.getRooms();

  if (createdRooms.length === 0) {
    throw new Error('Map generation failed: No rooms were created.');
  }

  for (const room of createdRooms) {
    room.getDoors((x, y) => {
      map[y][x] = { char: theme.floor, walkable: true, transparent: true };
    });
  }

  const firstRoom = createdRooms[0];
  playerStart = { x: firstRoom.getCenter()[0], y: firstRoom.getCenter()[1] };


  map[playerStart.y][playerStart.x] = { char: theme.floor, walkable: true, transparent: true }; // Ensure player start is walkable

  return { map, playerStart, rooms: createdRooms };
}

function generateUniformMap(
  width: number,
  height: number,
  theme: any
): { map: TileMap; playerStart: { x: number; y: number }; rooms: any[] } {
  RNG.setSeed(Date.now() + randomInt(1, 10000));

  const map = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ char: theme.wall, walkable: false, transparent: false }))
  );

  const uniformOptions = {
    roomWidth: [3, 9] as [number, number],
    roomHeight: [3, 5] as [number, number],
    roomDugPercentage: 0.8,
  };

  const uniform = new Map.Uniform(width, height, uniformOptions);

  uniform.create((x, y, value) => {
    if (value) {
      return;
    }
    map[y][x] = { char: theme.floor, walkable: true, transparent: true };
  });

  const createdRooms = uniform.getRooms();

  if (createdRooms.length === 0) {
    throw new Error('Map generation failed: No rooms were created.');
  }

  for (const room of createdRooms) {
    room.getDoors((x, y) => {
      map[y][x] = { char: theme.floor, walkable: true, transparent: true };
    });
  }

  const firstRoom = createdRooms[0];
  const playerStart = { x: firstRoom.getCenter()[0], y: firstRoom.getCenter()[1] };

  map[playerStart.y][playerStart.x] = { char: theme.floor, walkable: true, transparent: true };

  return { map, playerStart, rooms: createdRooms };
}

export function generateMap(
  mapDefinition: MapDefinition,
  theme: any
): { map: TileMap; playerStart: { x: number; y: number }; rooms: any[] } {
  const { width, height, generator } = mapDefinition;

  switch (generator.type) {
    case 'digger':
      return generateDiggerMap(width, height, theme);
    case 'uniform':
      return generateUniformMap(width, height, theme);
    default:
      throw new Error(`Unknown map generator type: ${generator.type}`);
  }
}
