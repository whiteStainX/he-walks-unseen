import type { GameState } from '../engine/state.js';
import { calculateFov } from './fov.js';

const FOV_RADIUS = 8;

/**
 * Updates the visible and explored tiles in the game state based on the player's position.
 * @param state The current game state.
 * @returns A new game state with updated visibility information.
 */
export function updateVisibility(state: GameState): void {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) {
    return;
  }

  const visibleTiles = calculateFov(state.map, player.position, FOV_RADIUS);

  state.visibleTiles = visibleTiles;
  state.exploredTiles = new Set([...(state.exploredTiles || []), ...visibleTiles]);
}