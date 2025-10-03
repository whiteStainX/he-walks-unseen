import type { Actor, GameState, Point } from '../engine/state.js';
import { FOV, Path } from 'rot-js';
import { handleAttack } from './combat.js';

/**
 * Runs the turn for a single non-player actor.
 * @param enemy The actor whose turn it is.
 * @param state The current game state.
 * @returns The updated game state after the enemy's turn.
 */
export function runEnemyTurn(enemy: Actor, state: GameState): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) {
    return state; // No player, do nothing
  }

  // 1. Check for visibility using rot-js FOV
  const fov = new FOV.PreciseShadowcasting(
    (x, y) => state.map.tiles[y]?.[x]?.transparent ?? false
  );

  let playerVisible = false;
  // Compute FOV with a radius of 8
  fov.compute(enemy.position.x, enemy.position.y, 8, (x, y) => {
    if (x === player.position.x && y === player.position.y) {
      playerVisible = true;
    }
  });

  if (!playerVisible) {
    return state; // Player not seen, do nothing for now
  }

  // 2. If visible, move towards the player using rot-js A* pathfinding
  const astar = new Path.AStar(
    player.position.x,
    player.position.y,
    (x, y) => {
      // The tile must be walkable and not occupied by another actor (unless it's the player)
      const isOccupied = state.actors.some(
        (a) => !a.isPlayer && a.position.x === x && a.position.y === y
      );
      return (state.map.tiles[y]?.[x]?.walkable ?? false) && !isOccupied;
    },
    { topology: 4 } // 4-directional movement
  );

  const path: Point[] = [];
  astar.compute(enemy.position.x, enemy.position.y, (x, y) => {
    path.push({ x, y });
  });

  // The path includes the starting point, so we need at least 2 points to move.
  if (path.length > 1) {
    const nextStep = path[1];

    // If the next step is the player's position, attack. Otherwise, move.
    if (nextStep.x === player.position.x && nextStep.y === player.position.y) {
      return handleAttack(enemy, player, state);
    } else {
      // Move towards the player
      const newActors = state.actors.map((actor) => {
        if (actor.id === enemy.id) {
          return { ...actor, position: nextStep };
        }
        return actor;
      });

      return {
        ...state,
        actors: newActors,
        message: `${enemy.name} spots you and moves closer!`,
        messageType: 'info',
      };
    }
  }

  return state; // No path found or already next to the player
}