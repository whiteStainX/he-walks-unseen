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

export function handlePlayerAction(state: GameState, action: GameAction): void {

  const player = state.actors.find((a) => a.isPlayer);
  if (!player) return;

  switch (action) {
    case GameAction.OPEN_INVENTORY: {
      const hasItems = player.inventory && player.inventory.length > 0;
      const message = hasItems
        ? 'Select an item to use.'
        : 'Your inventory is empty.';
      addLogMessage(state, message, 'info');
      state.phase = 'Inventory';
      state.selectedItemIndex = hasItems ? 0 : undefined;
      return;
    }

    case GameAction.PICKUP_ITEM: {
      const itemIndex = state.items.findIndex(
        (i) =>
          i.position.x === player.position.x && i.position.y === player.position.y
      );

      if (itemIndex === -1) {
        addLogMessage(state, 'There is nothing here to pick up.', 'info');
        return;
      }

      const item = state.items[itemIndex];
      player.inventory = player.inventory || [];
      player.inventory.push(item);
      state.items.splice(itemIndex, 1);
      state.phase = 'PlayerTurn';

      addLogMessage(state, `You picked up the ${item.name}.`, 'info');
      return;
    }

    case GameAction.START_INTERACTION: {
      addLogMessage(state, 'Which direction?', 'info');
      state.phase = 'Targeting';
      return;
    }

    case GameAction.OPEN_MESSAGE_LOG: {
      state.phase = 'MessageLog';
      return;
    }
  }

  const delta = MOVEMENT_DELTAS[action];
  if (!delta) {
    return;
  }

  const targetX = player.position.x + delta.dx;
  const targetY = player.position.y + delta.dy;

  const targetEntity = state.entities.find(
    (e) => e.position.x === targetX && e.position.y === targetY
  );

  if (targetEntity && targetEntity.interaction?.type === 'portal') {
    handleInteraction(state, targetX, targetY);
    return;
  }

  if (targetEntity && targetEntity.interaction?.type === 'stairs') {
    handleInteraction(state, targetX, targetY);
    return;
  }

  const targetEnemy = state.actors.find(
    (a) => !a.isPlayer && a.position.x === targetX && a.position.y === targetY
  );

  if (targetEnemy) {
    addLogMessage(state, `You engage the ${targetEnemy.name}.`, 'info');
    state.phase = 'CombatMenu';
    state.combatTargetId = targetEnemy.id;
    state.selectedCombatMenuIndex = 0;
    return;
  }

  if (isBlocked(state, targetX, targetY)) {
    const boundaryMessage =
      targetX < 0 ||
      targetX >= state.map.width ||
      targetY < 0 ||
      targetY >= state.map.height
        ? "You can't step beyond the treeline."
        : 'A wall blocks your way.';
    addLogMessage(state, boundaryMessage, 'info');
    return;
  }

  player.position.x = targetX;
  player.position.y = targetY;
  state.phase = 'EnemyTurn';

  updateVisibility(state);

  addLogMessage(state, delta.successMessage, 'info');
}