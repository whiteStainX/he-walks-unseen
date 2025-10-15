import type { GameState } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { applyEffect } from './itemEffects.js';
import { processItemConsumption } from './inventoryActions.js';
import { handleInteraction } from './interaction.js';
import { addLogMessage } from '../lib/logger.js';;

// This is duplicated from updateState.ts. We should find a better home for it later.
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

export function handleTargeting(state: GameState, action: GameAction): void {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) return;

  if (action === GameAction.CANCEL_TARGETING) {
    state.phase = 'PlayerTurn';
    state.pendingItem = undefined;
    state.target = undefined;
    return;
  }

  const delta = MOVEMENT_DELTAS[action];
  if (!delta) {
    return;
  }

  const targetX = player.position.x + delta.dx;
  const targetY = player.position.y + delta.dy;
  const targetPoint = { x: targetX, y: targetY };

  if (state.pendingItem) {
    const itemToUse = state.pendingItem;
    const effect = itemToUse.effects?.[0];

    if (!effect) {
      addLogMessage(state, 'Invalid item effect.', 'info');
      state.phase = 'PlayerTurn';
      state.pendingItem = undefined;
      return;
    }

    applyEffect(player, state, effect, targetPoint);

    const { message: consumptionMessage } = processItemConsumption(
      state,
      itemToUse
    );

    state.phase = 'EnemyTurn';
    state.pendingItem = undefined;
    state.target = undefined;

    if (consumptionMessage) {
      addLogMessage(state, consumptionMessage, 'info');
    }

    return;
  }

  const interactionTookControl = handleInteraction(state, targetX, targetY);

  if (!interactionTookControl) {
    state.phase = 'EnemyTurn';
  }
  state.target = undefined;
}
