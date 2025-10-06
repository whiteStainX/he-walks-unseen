import type { GameState } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { updateVisibility } from './visibility.js';
import { handleInteraction } from './interaction.js';
import { addLogMessage } from './logger.js';

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

export function handlePlayerAction(
  state: GameState,
  action: GameAction
): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) return state;

  if (action === GameAction.OPEN_INVENTORY) {
    const hasItems = player.inventory && player.inventory.length > 0;
    const message = hasItems
      ? 'Select an item to use.'
      : 'Your inventory is empty.';
    const stateWithMessage = addLogMessage(state, message, 'info');
    return {
      ...stateWithMessage,
      phase: 'Inventory',
      selectedItemIndex: hasItems ? 0 : undefined,
    };
  }

  if (action === GameAction.PICKUP_ITEM) {
    const item = state.items.find(
      (i) =>
        i.position.x === player.position.x && i.position.y === player.position.y
    );

    if (!item) {
      return addLogMessage(state, 'There is nothing here to pick up.', 'info');
    }

    const playerInventory = player.inventory || [];
    const updatedInventory = [...playerInventory, item];
    const updatedPlayer = { ...player, inventory: updatedInventory };

    const updatedItems = state.items.filter((i) => i.id !== item.id);

    const updatedActors = state.actors.map((a) =>
      a.id === player.id ? updatedPlayer : a
    );

    const stateWithItem: GameState = {
      ...state,
      actors: updatedActors,
      items: updatedItems,
      phase: 'PlayerTurn',
    };

    return addLogMessage(
      stateWithItem,
      `You picked up the ${item.name}.`,
      'info'
    );
  }

  if (action === GameAction.START_INTERACTION) {
    const stateWithMessage = addLogMessage(state, 'Which direction?', 'info');
    return {
      ...stateWithMessage,
      phase: 'Targeting',
    };
  }

  if (action === GameAction.OPEN_MESSAGE_LOG) {
    return { ...state, phase: 'MessageLog' };
  }

  const delta = MOVEMENT_DELTAS[action];
  if (!delta) {
    return state;
  }

  const targetX = player.position.x + delta.dx;
  const targetY = player.position.y + delta.dy;

  const targetEntity = state.entities.find(
    (e) => e.position.x === targetX && e.position.y === targetY
  );

  if (targetEntity && targetEntity.interaction?.type === 'stairs') {
    return handleInteraction(state, targetX, targetY);
  }

  const targetEnemy = state.actors.find(
    (a) => !a.isPlayer && a.position.x === targetX && a.position.y === targetY
  );

  if (targetEnemy) {
    const stateWithMessage = addLogMessage(
      state,
      `You engage the ${targetEnemy.name}.`,
      'info'
    );
    return {
      ...stateWithMessage,
      phase: 'CombatMenu',
      combatTargetId: targetEnemy.id,
      selectedCombatMenuIndex: 0,
    };
  }

  if (isBlocked(state, targetX, targetY)) {
    const boundaryMessage =
      targetX < 0 ||
      targetX >= state.map.width ||
      targetY < 0 ||
      targetY >= state.map.height
        ? "You can't step beyond the treeline."
        : 'A wall blocks your way.';
    return addLogMessage(state, boundaryMessage, 'info');
  }

  const actorsAfterPlayerMove = state.actors.map((actor) =>
    actor.id === player.id
      ? { ...actor, position: { x: targetX, y: targetY } }
      : actor
  );

  const stateAfterMove: GameState = {
    ...state,
    actors: actorsAfterPlayerMove,
    items: state.items,
    phase: 'EnemyTurn',
  };

  const stateWithVisibility = updateVisibility(stateAfterMove);

  return addLogMessage(stateWithVisibility, delta.successMessage, 'info');
}
