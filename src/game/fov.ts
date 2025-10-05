import { FOV } from 'rot-js';
import type { GameState, Point } from '../engine/state.js';

/**
 * Calculates the player's field of view.
 *
 * @param map - The game map.
 * @param playerPosition - The player's current position.
 * @param radius - The radius of the FOV.
 * @returns A Set of visible tile coordinates in "x,y" format.
 */
export const calculateFov = (
  map: GameState['map'],
  playerPosition: Point,
  radius: number
): Set<string> => {
  const fov = new FOV.PreciseShadowcasting((x, y) => {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
      return false;
    }
    return map.tiles[y][x].transparent;
  });

  const visibleTiles = new Set<string>();

  fov.compute(playerPosition.x, playerPosition.y, radius, (x, y) => {
    visibleTiles.add(`${x},${y}`);
  });

  return visibleTiles;
};