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

function handlePlayerAction(state: GameState, action: GameAction): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) return state; // Should not happen

  const delta = MOVEMENT_DELTAS[action];
  if (!delta) return state; // Not a turn-passing action

  const targetX = player.position.x + delta.dx;
  const targetY = player.position.y + delta.dy;

  // Check for enemy at target location
  const targetEnemy = state.actors.find(
    (a) => !a.isPlayer && a.position.x === targetX && a.position.y === targetY
  );

  if (targetEnemy) {
    const { newState, message } = handleAttack(player, targetEnemy, state);
    return { ...newState, message, phase: 'EnemyTurn' };
  }

  // Check for blocked tiles
  if (isBlocked(state, targetX, targetY)) {
    const boundaryMessage =
      targetX < 0 ||
      targetX >= state.map.width ||
      targetY < 0 ||
      targetY >= state.map.height
        ? "You can't step beyond the treeline."
        : 'A wall blocks your way.';
    return { ...state, message: boundaryMessage }; // No turn passes
  }

  // The player is moving to a new tile
  const actorsAfterPlayerMove = state.actors.map((actor) =>
    actor.id === player.id
      ? { ...actor, position: { x: targetX, y: targetY } }
      : actor
  );

  let message = delta.successMessage;
  let finalActors = actorsAfterPlayerMove;
  let finalItems = state.items;

  // Check for an item (potion) at the target location
  const targetItem = state.items.find(
    (item) => item.position.x === targetX && item.position.y === targetY
  );

  if (targetItem) {
    const playerAfterMove = finalActors.find((a) => a.isPlayer)!;
    let newPlayerHp = playerAfterMove.hp.current;

    if (targetItem.effect === 'heal') {
      newPlayerHp = Math.min(
        playerAfterMove.hp.max,
        playerAfterMove.hp.current + targetItem.potency
      );
      message = `You drink a potion and feel refreshed, gaining ${targetItem.potency} HP.`;
    } else if (targetItem.effect === 'damage') {
      newPlayerHp -= targetItem.potency;
      message = `The potion burns your throat! You lose ${targetItem.potency} HP.`;
    }

    const updatedPlayer = {
      ...playerAfterMove,
      hp: { ...playerAfterMove.hp, current: newPlayerHp },
    };

    finalActors = finalActors.map((actor) =>
      actor.id === player.id ? updatedPlayer : actor
    );
    finalItems = state.items.filter((item) => item.id !== targetItem.id);

    // Check for death after drinking a damage potion
    if (newPlayerHp <= 0) {
      return {
        ...state,
        actors: finalActors,
        items: finalItems,
        phase: 'Loss',
        message: `${message} You have been defeated.`,
      };
    }
  }

  // Check for win condition on the target tile
  const isExit = state.map.tiles[targetY][targetX].char === '>';
  if (isExit) {
    return {
      ...state,
      actors: finalActors,
      items: finalItems,
      phase: 'Win',
      message: 'You have escaped the dungeon!',
    };
  }

  // End of turn: transition to enemy turn
  return {
    ...state,
    actors: finalActors,
    items: finalItems,
    message,
    phase: 'EnemyTurn',
  };
}

function handleEnemyTurns(state: GameState): GameState {
  const enemies = state.actors.filter((a) => !a.isPlayer);
  let stateAfterEnemyTurns = state;

  for (const enemy of enemies) {
    // Ensure the enemy is still alive before its turn
    if (stateAfterEnemyTurns.actors.find((a) => a.id === enemy.id)) {
      stateAfterEnemyTurns = runEnemyTurn(enemy, stateAfterEnemyTurns);
    }
  }

  // Check for loss condition after all enemies have acted
  const player = stateAfterEnemyTurns.actors.find((a) => a.isPlayer);
  if (!player || player.hp.current <= 0) {
    return {
      ...stateAfterEnemyTurns,
      phase: 'Loss',
      message: 'You have been defeated.',
    };
  }

  // Return to player's turn
  return { ...stateAfterEnemyTurns, phase: 'PlayerTurn' };
}

export function applyActionToState(
  state: GameState,
  action: GameAction
): GameState {
  if (action === GameAction.QUIT) {
    return { ...state, message: 'Press Ctrl+C to exit the simulation.' };
  }

  if (state.phase === 'Win' || state.phase === 'Loss') {
    return state; // Game is over, no more actions
  }

  if (state.phase === 'PlayerTurn') {
    return handlePlayerAction(state, action);
  }

  // This function is now only for player actions, so we shouldn't get here.
  return state;
}

export function processEnemyTurns(state: GameState): GameState {
  if (state.phase !== 'EnemyTurn') {
    return state;
  }
  return handleEnemyTurns(state);
}
