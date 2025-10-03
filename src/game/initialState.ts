import { nanoid } from 'nanoid';
import type { GameState, Actor, Point, Tile } from '../engine/state.js';
import { generateMap } from './map-generation.js';

const MAP_WIDTH = 80;
const MAP_HEIGHT = 24;

/**
 * Finds a random walkable tile on the map that is not in the list of occupied points.
 * @param map The tile map to search.
 * @param occupied An array of points that are considered occupied.
 * @returns A random walkable and unoccupied point, or null if none is found.
 */
function findRandomWalkableTile(map: Tile[][], occupied: Point[]): Point | null {
  const walkableTiles: Point[] = [];
  const isOccupied = (p: Point) => occupied.some((o) => o.x === p.x && o.y === p.y);

  for (let y = 0; y < map.length; y += 1) {
    for (let x = 0; x < map[y].length; x += 1) {
      const point = { x, y };
      if (map[y][x].walkable && !isOccupied(point)) {
        walkableTiles.push(point);
      }
    }
  }

  if (walkableTiles.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * walkableTiles.length);
  return walkableTiles[randomIndex];
}

export function createInitialGameState(message?: string): GameState {
  const { map, playerStart, exitPosition } = generateMap(MAP_WIDTH, MAP_HEIGHT);

  const player: Actor = {
    id: 'player',
    name: 'Player',
    char: '@',
    position: playerStart,
    hp: { current: 10, max: 10 },
    attack: 2,
    defense: 1,
    isPlayer: true,
  };

  const goblinPosition = findRandomWalkableTile(map, [player.position, exitPosition]);

  const goblin: Actor = {
    id: nanoid(),
    name: 'Goblin',
    char: 'g',
    // Fallback to (0,0) shouldn't happen in a valid map, but it prevents a crash.
    position: goblinPosition ?? { x: 0, y: 0 },
    hp: { current: 5, max: 5 },
    attack: 1,
    defense: 0,
  };

  const actors = [player];
  if (goblinPosition) {
    actors.push(goblin);
  }

  return {
    phase: 'Playing',
    actors,
    map: {
      tiles: map,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
    },
    message: message ?? 'Welcome! Use the arrow keys or WASD to move. Find the > to exit.',
  };
}