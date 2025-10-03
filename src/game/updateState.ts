import type { GameState } from '../engine/state.js';
import { GameAction } from '../input/actions.js';

interface MovementDelta {
  dx: number;
  dy: number;
  successMessage: string;
}

const MOVEMENT_DELTAS: Partial<Record<GameAction, MovementDelta>> = {
  [GameAction.MOVE_NORTH]: { dx: 0, dy: -1, successMessage: 'You move north.' },
  [GameAction.MOVE_SOUTH]: { dx: 0, dy: 1, successMessage: 'You move south.' },
  [GameAction.MOVE_EAST]: { dx: 1, dy: 0, successMessage: 'You move east.' },
  [GameAction.MOVE_WEST]: { dx: -1, dy: 0, successMessage: 'You move west.' },
};

function isBlocked(state: GameState, x: number, y: number): boolean {
  if (x < 0 || x >= state.map.width || y < 0 || y >= state.map.height) {
    return true;
  }

  return !state.map.tiles[y][x].walkable;
}

import { runEnemyTurn } from './ai.js';
import { handleAttack } from './combat.js';

export function applyActionToState(state: GameState, action: GameAction): GameState {
  if (action === GameAction.QUIT) {
    return { ...state, message: 'Press Ctrl+C to exit the simulation.' };
  }

  if (state.phase === 'Win' || state.phase === 'Loss') {
    return state; // Game is over, no more actions
  }

  const player = state.actors.find((a) => a.isPlayer);
  if (!player) {
    return state; // Should not happen
  }

  const delta = MOVEMENT_DELTAS[action];
  if (!delta) {
    return state; // Not a turn-passing action
  }

  const targetX = player.position.x + delta.dx;
  const targetY = player.position.y + delta.dy;
  let stateAfterPlayerAction: GameState;

  const targetEnemy = state.actors.find(
    (a) => !a.isPlayer && a.position.x === targetX && a.position.y === targetY
  );

  if (targetEnemy) {
    const { newState, message } = handleAttack(player, targetEnemy, state);
    stateAfterPlayerAction = { ...newState, message };
  } else {
    if (isBlocked(state, targetX, targetY)) {
      const boundaryMessage =
        targetX < 0 || targetX >= state.map.width || targetY < 0 || targetY >= state.map.height
          ? "You can't step beyond the treeline."
          : 'A wall blocks your way.';
      return { ...state, message: boundaryMessage }; // No turn passes
    }

    // Check for win condition on the target tile
    const isExit = state.map.tiles[targetY][targetX].char === '>';
    const actorsAfterPlayerMove = state.actors.map((actor) =>
      actor.id === player.id ? { ...actor, position: { x: targetX, y: targetY } } : actor
    );

    if (isExit) {
      return {
        ...state,
        phase: 'Win',
        actors: actorsAfterPlayerMove,
        message: 'You have escaped the dungeon!',
      };
    }

    // Normal move
    stateAfterPlayerAction = {
      ...state,
      actors: actorsAfterPlayerMove,
      message: delta.successMessage,
    };
  }

  // Process enemy turns
  const enemies = stateAfterPlayerAction.actors.filter((a) => !a.isPlayer);
  let stateAfterEnemyTurns = stateAfterPlayerAction;
  for (const enemy of enemies) {
    stateAfterEnemyTurns = runEnemyTurn(enemy, stateAfterEnemyTurns);
  }

  // Check for loss condition
  const finalPlayer = stateAfterEnemyTurns.actors.find((a) => a.isPlayer);
  if (!finalPlayer) {
    return {
      ...stateAfterEnemyTurns,
      phase: 'Loss',
      message: 'You have been defeated.',
    };
  }

  return stateAfterEnemyTurns;
}
