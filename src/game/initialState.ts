import { nanoid } from 'nanoid';
import type {
  GameState,
  Actor,
  Point,
  Tile,
  Item,
  PotionEffect,
} from '../engine/state.js';
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
    color: 'white',
    position: playerStart,
    hp: { current: 10, max: 10 },
    attack: 2,
    defense: 1,
    isPlayer: true,
  };

  const actors: Actor[] = [player];
  const occupiedPoints: Point[] = [player.position, exitPosition];

  // Spawn a random number of enemies (e.g., between 2 and 5)
  const numberOfEnemies = Math.floor(Math.random() * 4) + 2;

  for (let i = 0; i < numberOfEnemies; i++) {
    const enemyPosition = findRandomWalkableTile(map, occupiedPoints);

    if (enemyPosition) {
      const goblin: Actor = {
        id: nanoid(),
        name: 'Goblin',
        char: 'g',
        color: 'lightgreen',
        position: enemyPosition,
        hp: { current: 5, max: 5 },
        attack: 1,
        defense: 0,
      };
      actors.push(goblin);
      // Mark the new position as occupied for subsequent spawns
      occupiedPoints.push(enemyPosition);
    }
  }

  const items: Item[] = [];
  const numberOfPotions = Math.floor(Math.random() * 3) + 2; // 2 to 4 potions
  const potionEffects: PotionEffect[] = ['heal', 'damage'];

  for (let i = 0; i < numberOfPotions; i++) {
    const potionPosition = findRandomWalkableTile(map, occupiedPoints);
    if (potionPosition) {
      const randomEffect = potionEffects[Math.floor(Math.random() * potionEffects.length)];
      const potion: Item = {
        id: nanoid(),
        name: 'Unidentified Potion',
        char: '!',
        color: 'magenta',
        position: potionPosition,
        effect: randomEffect,
        potency: randomEffect === 'heal' ? 5 : 3, // Heal more than damage
      };
      items.push(potion);
      occupiedPoints.push(potionPosition);
    }
  }

  return {
    phase: 'PlayerTurn',
    actors,
    items,
    map: {
      tiles: map,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
    },
    message: message ?? 'Welcome! Use the arrow keys or WASD to move. Find the > to exit.',
    messageType: 'info',
  };
}