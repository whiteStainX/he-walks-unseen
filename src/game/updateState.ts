import type { GameState } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { handleInventoryAction } from './inventoryActions.js';
import { handleTargeting } from './targetingActions.js';
import { handleCombatMenuAction } from './combatMenuActions.js';
import { handleIdentifyMenuAction } from './identifyActions.js';
import { handleMessageLogAction } from './messageLogActions.js';
import { handlePlayerAction } from './playerActions.js';
import { addLogMessage } from './logger.js';

export function applyActionToState(
  state: GameState,
  action: GameAction
): GameState {
  if (action === GameAction.QUIT) {
    return addLogMessage(
      state,
      'Press Ctrl+C to exit the simulation.',
      'info'
    );
  }

  if (state.phase === 'Win' || state.phase === 'Loss') {
    return state;
  }

  if (state.phase === 'PlayerTurn') {
    return handlePlayerAction(state, action);
  }

  if (state.phase === 'Inventory') {
    return handleInventoryAction(state, action);
  }

  if (state.phase === 'Targeting') {
    return handleTargeting(state, action);
  }

  if (state.phase === 'CombatMenu') {
    return handleCombatMenuAction(state, action);
  }

  if (state.phase === 'IdentifyMenu') {
    return handleIdentifyMenuAction(state, action);
  }

  if (state.phase === 'MessageLog') {
    return handleMessageLogAction(state, action);
  }

  return state;
}
