import { nanoid } from 'nanoid';
import type {
  GameState,
  Actor,
  Point,
  Tile,
  Item,
  PotionEffect,
  Entity,
} from '../engine/state.js';
import { generateMap } from './map-generation.js';
import { getResource } from '../engine/resourceManager.js';

const MAP_WIDTH = 80;
const MAP_HEIGHT = 24;

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

interface InitialStateOptions {
  message?: string;
  player?: Actor;
  floor?: number;
  floorStates?: Map<number, GameState>;
}

export function createInitialGameState(options: InitialStateOptions = {}): GameState {
  const { message, player: existingPlayer, floor = 1, floorStates = new Map() } = options;

  const themes = getResource<any>('themes');
  const theme = Object.values(themes).find((t: any) => t.floors.includes(floor)) || themes['overgrown-keep'];

  const { map, playerStart, exitPosition, rooms } = generateMap(MAP_WIDTH, MAP_HEIGHT, theme.map);

  const player: Actor = existingPlayer
    ? { ...existingPlayer, position: playerStart }
    : {
        id: 'player',
        name: 'Player',
        char: '@',
        color: 'white',
        position: playerStart,
        hp: { current: 10, max: 10 },
        attack: 2,
        defense: 1,
        isPlayer: true,
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
      };

  const actors: Actor[] = [player];
  const entities: Entity[] = [];
  const items: Item[] = [];
  const occupiedPoints: Point[] = [player.position, exitPosition];

  const enemyTemplates = getResource<any[]>('enemies').filter(e => theme.enemies.includes(e.id));
  const numberOfEnemies = Math.floor(Math.random() * 4) + 2;

  for (let i = 0; i < numberOfEnemies; i++) {
    const enemyPosition = findRandomWalkableTile(map, occupiedPoints);
    if (enemyPosition) {
      const template = enemyTemplates[Math.floor(Math.random() * enemyTemplates.length)];
      const newEnemy: Actor = {
        ...template,
        id: nanoid(),
        position: enemyPosition,
      };
      actors.push(newEnemy);
      occupiedPoints.push(enemyPosition);
    }
  }

  const itemTemplates = getResource<any[]>('items').filter(i => theme.items.includes(i.id));
  const numberOfItems = Math.floor(Math.random() * 3) + 2;

  for (let i = 0; i < numberOfItems; i++) {
    const itemPosition = findRandomWalkableTile(map, occupiedPoints);
    if (itemPosition) {
      const template = itemTemplates[Math.floor(Math.random() * itemTemplates.length)];
      if (template) {
        const newItem: Item = {
          ...template,
          id: nanoid(),
          position: itemPosition,
        };
        items.push(newItem);
        occupiedPoints.push(itemPosition);
      }
    }
  }

  const entityTemplates = getResource<any[]>('entities');
  const doorTemplate = entityTemplates.find((e) => e.id === 'door');
  if (doorTemplate) {
    rooms.forEach(room => {
      room.getDoors((x: number, y: number) => {
        const door: Entity = {
          ...doorTemplate,
          id: nanoid(),
          position: { x, y },
        };
        entities.push(door);
        occupiedPoints.push({ x, y });
        map[y][x] = { ...map[y][x], walkable: false };
      });
    });
  }

  const chestTemplate = entityTemplates.find((e) => e.id === 'chest');
  if (chestTemplate) {
    const numberOfChests = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < numberOfChests; i++) {
      const chestPosition = findRandomWalkableTile(map, occupiedPoints);
      if (chestPosition) {
        const chest: Entity = {
          ...chestTemplate,
          id: nanoid(),
          position: chestPosition,
        };
        entities.push(chest);
        occupiedPoints.push(chestPosition);
      }
    }
  }

  const downstairsTemplate = entityTemplates.find((e) => e.id === 'downstairs');
  if (downstairsTemplate && floor < 5) { // Don't spawn downstairs on the last floor
    const downstairs: Entity = {
      ...downstairsTemplate,
      id: nanoid(),
      position: exitPosition,
    };
    entities.push(downstairs);
    occupiedPoints.push(exitPosition);
  }

  if (floor > 1) {
    const upstairsTemplate = entityTemplates.find((e) => e.id === 'upstairs');
    if (upstairsTemplate) {
      const upstairs: Entity = {
        ...upstairsTemplate,
        id: nanoid(),
        position: playerStart, // Player starts at the upstairs
      };
      entities.push(upstairs);
      occupiedPoints.push(playerStart);
    }
  }

  return {
    phase: 'PlayerTurn',
    actors,
    items,
    entities,
    map: {
      tiles: map,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
    },
    message: message ?? `Welcome to floor ${floor}! Use the arrow keys or WASD to move. Find the > to exit.`,
    messageType: 'info',
    currentFloor: floor,
    floorStates,
  };
}
