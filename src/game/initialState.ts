import { nanoid } from 'nanoid';
import type {
  GameState,
  Actor,
  Point,
  Tile,
  Item,
  Entity,
} from '../engine/state.js';
import type { ThemeName } from '../themes.js';
import { Path } from 'rot-js';
import { generateMap } from './world/map-generation.js';
import { getResource } from '../engine/resourceManager.js';
import { updateVisibility } from '../lib/visibility.js';;
import { addLogMessage } from '../lib/logger.js';;
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
  theme?: ThemeName;
}

export function createInitialGameState(
  options: InitialStateOptions = {}
): GameState {
  const {
    message,
    player: existingPlayer,
    mapId,
    mapStates = new Map(),
    theme: chosenTheme = 'amber',
  } = options;

  const currentMapId = mapId || getStartMapId();
  const mapDefinition = getMapDefinition(currentMapId);

  if (!mapDefinition) {
    throw new Error(`Map with id "${currentMapId}" not found in world data.`);
  }

  const themes = getResource<any>('environmentThemes');
  const theme = themes[mapDefinition.theme];

  const { map, playerStart, rooms } = generateMap(mapDefinition, theme.map);

  const player: Actor = existingPlayer
    ? { ...existingPlayer, position: playerStart }
    : {
        ...(instantiate('player') as Actor),
        id: 'player',
        position: playerStart,
        isPlayer: true,
      };

  const actors: Actor[] = [player];
  const entities: Entity[] = [];
  const items: Item[] = [];
  const occupiedPoints: Point[] = [player.position];

  // Entity Placement Logic
  if (mapDefinition.entityPlacement) {
    // Explicit placement
    if (mapDefinition.entityPlacement.placements) {
      for (const placementInfo of mapDefinition.entityPlacement.placements) {
        const newEntity = instantiate(placementInfo.id);
        if (newEntity) {
          (newEntity as Entity).position = placementInfo.position;
          if ('hp' in newEntity) {
            actors.push(newEntity as Actor);
          } else if ('effects' in newEntity || 'equipment' in newEntity) {
            items.push(newEntity as Item);
          } else {
            entities.push(newEntity as Entity);
          }
          occupiedPoints.push(placementInfo.position);
        }
      }
    }

    // Random entity placement
    if (mapDefinition.entityPlacement.random) {
      for (const randomPlacement of mapDefinition.entityPlacement.random) {
        for (let i = 0; i < randomPlacement.count; i++) {
          const position = findRandomWalkableTile(map, occupiedPoints);
          if (position) {
            const prefabId = randomPlacement.types[Math.floor(Math.random() * randomPlacement.types.length)];
            const newEntity = instantiate(prefabId);
            if (newEntity) {
              (newEntity as Entity).position = position;
              if ('hp' in newEntity) {
                actors.push(newEntity as Actor);
              } else if ('effects' in newEntity || 'equipment' in newEntity) {
                items.push(newEntity as Item);
              } else {
                entities.push(newEntity as Entity);
              }
              occupiedPoints.push(position);
            }
          }
        }
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
    const availableRooms = rooms.filter(room => {
        const center = room.getCenter();
        return !(center[0] === playerStart.x && center[1] === playerStart.y);
    });

    if (availableRooms.length < mapDefinition.connections.length) {
        throw new Error(`Not enough rooms to place all portals for map "${currentMapId}"`);
    }

    mapDefinition.connections.forEach((connection) => {
      const roomIndex = Math.floor(Math.random() * availableRooms.length);
      const room = availableRooms.splice(roomIndex, 1)[0];
      const center = room.getCenter();
      const position = { x: center[0], y: center[1] };

      const portal: Entity = {
        ...portalTemplate,
        id: nanoid(), // The entity ID itself
        position,
        interaction: {
          type: 'portal',
          id: connection.id, // The portal's functional ID
          targetMapId: connection.targetMapId,
          targetPortalId: connection.targetPortalId,
        },
      };
      entities.push(portal);
      occupiedPoints.push(position);
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

  const portals = entities.filter(
    (e) => e.interaction?.type === 'portal'
  );

  if (portals.length > 0) {
    const isPassable = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= mapDefinition.width || y >= mapDefinition.height) {
        return false;
      }
      const entityAtPos = entities.find(e => e.position.x === x && e.position.y === y);
      if (entityAtPos && entityAtPos.interaction?.type === 'door') {
        return true;
      }
      return map[y][x].walkable;
    };

    const astar = new Path.AStar(player.position.x, player.position.y, isPassable, {
      topology: 4,
    });

    let atLeastOnePortalReachable = false;
    for (const portal of portals) {
      let pathFound = false;
      astar.compute(portal.position.x, portal.position.y, (x, y) => {
        pathFound = true;
      });
      if (pathFound) {
        atLeastOnePortalReachable = true;
        break;
      }
    }

    if (!atLeastOnePortalReachable) {
      throw new Error(
        `Map generation failed for map "${currentMapId}": No portals are reachable from the player's starting position.`
      );
    }
  }

  const baseState: GameState = {
    phase: 'Welcome',
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
    activeTheme: chosenTheme,
  };

  addLogMessage(
    baseState,
    message ?? `Welcome! Use the arrow keys or WASD to move. Press 'e' to interact with objects and characters.`,
    'info'
  );

  updateVisibility(baseState);
  return baseState;
}