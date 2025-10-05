import type { GameState } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { applyEffect } from './itemEffects.js';
import { processItemConsumption } from './inventoryActions.js';
import { handleInteraction } from './interaction.js';

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

export function handleTargeting(state: GameState, action: GameAction): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) return state;

  if (action === GameAction.CANCEL_TARGETING) {
    return {
      ...state,
      phase: 'PlayerTurn',
      message: '',
      pendingItem: undefined,
      target: undefined,
    };
  }

  const delta = MOVEMENT_DELTAS[action];
  if (!delta) {
    return state;
  }

  const targetX = player.position.x + delta.dx;
  const targetY = player.position.y + delta.dy;
  const targetPoint = { x: targetX, y: targetY };

  if (state.pendingItem) {
    const itemToUse = state.pendingItem;
    const effect = itemToUse.effects?.[0];

    if (!effect) {
      return {
        ...state,
        phase: 'PlayerTurn',
        message: 'Invalid item effect.',
        messageType: 'info',
        pendingItem: undefined,
      };
    }

    const { state: stateAfterEffect, message: effectMessage } = applyEffect(
      player,
      state,
      effect,
      targetPoint
    );

    const { finalActors, finalMessage } = processItemConsumption(
      stateAfterEffect,
      itemToUse,
      effectMessage
    );

    return {
      ...stateAfterEffect,
      actors: finalActors,
      phase: 'EnemyTurn',
      pendingItem: undefined,
      target: undefined,
      message: finalMessage,
      messageType: 'info',
    };
  }

  return handleInteraction(state, targetX, targetY);
}
