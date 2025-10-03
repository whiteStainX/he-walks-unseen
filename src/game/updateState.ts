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

  return state.map.tiles[y][x] === '#';
}

export function applyActionToState(state: GameState, action: GameAction): GameState {
  if (action === GameAction.QUIT) {
    return {
      ...state,
      message: 'Press Ctrl+C to exit the simulation.',
    };
  }

  const delta = MOVEMENT_DELTAS[action];

  if (!delta) {
    return state;
  }

  const targetX = state.player.position.x + delta.dx;
  const targetY = state.player.position.y + delta.dy;

  if (isBlocked(state, targetX, targetY)) {
    const boundaryMessage =
      targetX < 0 ||
      targetX >= state.map.width ||
      targetY < 0 ||
      targetY >= state.map.height
        ? "You can't step beyond the treeline."
        : 'A wall blocks your way.';

    return {
      ...state,
      message: boundaryMessage,
    };
  }

  return {
    ...state,
    player: {
      ...state.player,
      position: {
        x: targetX,
        y: targetY,
      },
    },
    message: delta.successMessage,
  };
}
