import type { GameState, Point } from '../engine/state.js';
import { getResource } from '../engine/resourceManager.js';

interface MapDefinition {
  width: number;
  height: number;
  tiles: string[][];
}

interface MapResource {
  [key: string]: MapDefinition;
}

function findPlayerStart(tiles: string[][]): Point | null {
  for (let y = 0; y < tiles.length; y += 1) {
    for (let x = 0; x < tiles[y].length; x += 1) {
      if (tiles[y][x] === '@') {
        return { x, y };
      }
    }
  }

  return null;
}

export function createInitialGameState(message?: string, mapKey: string = 'default'): GameState {
  const maps = getResource<MapResource>('maps');
  const map = maps[mapKey];

  if (!map) {
    throw new Error(`Map with key "${mapKey}" not found in resources.`);
  }

  const tiles = map.tiles.map((row) => [...row]);
  const startPosition = findPlayerStart(tiles);
  let playerPosition: Point;

  if (startPosition) {
    tiles[startPosition.y][startPosition.x] = '.';
    playerPosition = startPosition;
  } else {
    playerPosition = {
      x: Math.floor(map.width / 2),
      y: Math.floor(map.height / 2),
    };
  }

  return {
    player: {
      position: playerPosition,
      hp: 5,
    },
    map: {
      tiles,
      width: map.width,
      height: map.height,
    },
    message: message ?? 'Use the arrow keys or WASD to move around the clearing.',
  };
}
