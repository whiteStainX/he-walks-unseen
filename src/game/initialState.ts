import { nanoid } from 'nanoid';
import type {
  GameState,
  Actor,
  Point,
  Tile,
  Item,
  Entity,
} from '../engine/state.js';
import { generateMap } from './map-generation.js';
import { getResource } from '../engine/resourceManager.js';
import { updateVisibility } from './visibility.js';
import { addLogMessage } from './logger.js';
import { instantiate } from '../engine/prefab.js';
import { getMapDefinition, getStartMapId } from '../engine/worldManager.js';

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
  mapId?: string;
  mapStates?: Map<string, GameState>;
}

export function createInitialGameState(options: InitialStateOptions = {}): GameState {
  const { message, player: existingPlayer, mapId, mapStates = new Map() } = options;

  const currentMapId = mapId || getStartMapId();
  const mapDefinition = getMapDefinition(currentMapId);

  if (!mapDefinition) {
    throw new Error(`Map with id "${currentMapId}" not found in world data.`);
  }

  const themes = getResource<any>('themes');
  const theme = themes[mapDefinition.theme];

  const { map, playerStart, rooms } = generateMap(mapDefinition, theme.map);

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
  const occupiedPoints: Point[] = [player.position];

  const numberOfEnemies = Math.floor(Math.random() * 4) + 2;
  for (let i = 0; i < numberOfEnemies; i++) {
    const enemyPosition = findRandomWalkableTile(map, occupiedPoints);
    if (enemyPosition) {
      const prefabId = theme.enemies[Math.floor(Math.random() * theme.enemies.length)];
      const newEnemy = instantiate(prefabId) as Omit<Actor, 'position'>;
      if (newEnemy) {
        (newEnemy as Actor).position = enemyPosition;
        actors.push(newEnemy as Actor);
        occupiedPoints.push(enemyPosition);
      }
    }
  }

  const numberOfItems = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < numberOfItems; i++) {
    const itemPosition = findRandomWalkableTile(map, occupiedPoints);
    if (itemPosition) {
      const prefabId = theme.items[Math.floor(Math.random() * theme.items.length)];
      const newItem = instantiate(prefabId) as Omit<Item, 'position'>;
      if (newItem) {
        (newItem as Item).position = itemPosition;
        items.push(newItem as Item);
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

  const portalTemplate = entityTemplates.find((e) => e.id === 'portal');
  if (portalTemplate && mapDefinition.connections) {
    mapDefinition.connections.forEach((connection) => {
      const portal: Entity = {
        ...portalTemplate,
        id: nanoid(),
        position: connection.position,
        interaction: {
          type: 'portal',
          targetMapId: connection.targetMapId,
          targetPosition: connection.targetPosition,
        },
      };
      entities.push(portal);
      occupiedPoints.push(connection.position);
      map[connection.position.y][connection.position.x].walkable = true;
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

  if (mapDefinition.prefabs) {
    mapDefinition.prefabs.forEach((prefabInfo) => {
      const newEntity = instantiate(prefabInfo.id);
      if (newEntity) {
        (newEntity as Entity).position = prefabInfo.position;

        if ('hp' in newEntity) {
          actors.push(newEntity as Actor);
        } else if ('effects' in newEntity || 'equipment' in newEntity) {
          items.push(newEntity as Item);
        } else {
          entities.push(newEntity as Entity);
        }
        occupiedPoints.push(prefabInfo.position);
      }
    });
  }

  const baseState: GameState = {
    phase: 'PlayerTurn',
    actors,
    items,
    entities,
    map: {
      tiles: map,
      width: mapDefinition.width,
      height: mapDefinition.height,
    },
    log: [],
    logOffset: 0,
    visibleTiles: new Set<string>(),
    exploredTiles: new Set<string>(),
    currentMapId: currentMapId,
    mapStates,
  };

  addLogMessage(
    baseState,
    message ?? `Welcome! Use the arrow keys or WASD to move.`,
    'info'
  );

  updateVisibility(baseState);
  return baseState;
}