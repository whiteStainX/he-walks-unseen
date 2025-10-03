import { RNG, Map } from 'rot-js';
import type { Tile } from '../engine/state.js';

export const WALL_TILE: Tile = { char: '#', walkable: false, transparent: false };
export const FLOOR_TILE: Tile = { char: '.', walkable: true, transparent: true };
export const EXIT_TILE: Tile = { char: '>', walkable: true, transparent: true };

export type TileMap = Tile[][];

// Helper to get a random integer between min and max (inclusive)
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateMap(width: number, height: number): { map: TileMap, playerStart: { x: number, y: number }, exitPosition: { x: number, y: number } } {
  // Each time a map is generated, we reset the RNG with a new random seed.
  RNG.setSeed(Date.now() + randomInt(1, 10000));

  const map = Array.from({ length: height }, () => Array.from({ length: width }, () => WALL_TILE));

  // Add some randomization to the dungeon generation
  const diggerOptions = {
    roomWidth: [randomInt(3, 8), randomInt(9, 15)],
    roomHeight: [randomInt(3, 6), randomInt(7, 12)],
    corridorLength: [randomInt(2, 5), randomInt(6, 10)],
    dugPercentage: Math.random() * 0.2 + 0.6, // 60% to 80%
  };

  const digger = new Map.Digger(width, height, diggerOptions);
  const rooms: any[] = [];
  let playerStart = { x: 0, y: 0 };
  let exitPosition = { x: 0, y: 0 };

  digger.create((x, y, value) => {
    if (value) {
      return;
    }
    map[y][x] = FLOOR_TILE;
  });

  const createdRooms = digger.getRooms();

  // If no rooms were created (can happen with restrictive options), retry with default options.
  if (createdRooms.length === 0) {
    return generateMap(width, height); // Recursive call to retry
  }

  for (const room of createdRooms) {
    rooms.push(room);
    room.getDoors((x, y) => {
      map[y][x] = FLOOR_TILE;
    });
  }

  // Shuffle rooms to get random start and end points
  const shuffledRooms = RNG.shuffle(rooms);
  const firstRoom = shuffledRooms[0];
  const lastRoom = shuffledRooms[shuffledRooms.length - 1];

  playerStart = { x: firstRoom.getCenter()[0], y: firstRoom.getCenter()[1] };
  exitPosition = { x: lastRoom.getCenter()[0], y: lastRoom.getCenter()[1] };

  // Ensure start and end are not the same if there's only one room
  if (shuffledRooms.length === 1) {
    const corners = firstRoom.getCorners();
    playerStart = { x: corners[0][0] + 1, y: corners[0][1] + 1 };
    exitPosition = { x: corners[2][0] - 1, y: corners[2][1] - 1 };
  }

  map[playerStart.y][playerStart.x] = FLOOR_TILE; // Ensure player start is walkable
  map[exitPosition.y][exitPosition.x] = EXIT_TILE;

  return { map, playerStart, exitPosition };
}