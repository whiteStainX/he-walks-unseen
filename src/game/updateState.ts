import { GameState } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { handleInventoryAction } from './inventoryActions.js';
import { handleTargeting } from './targetingActions.js';
import { handleCombatMenuAction } from './combatMenuActions.js';
import { handleIdentifyMenuAction } from './identifyActions.js';
import { handleMessageLogAction } from './messageLogActions.js';
import { handlePlayerAction } from './playerActions.js';
import { addLogMessage } from './logger.js';
import { eventBus } from '../engine/events.js';
import { getCurrentState } from '../engine/narrativeEngine.js';
import { produce } from 'immer';

export function updateState(action: GameAction): void {
  const currentState = getCurrentState();
  if (!currentState) return;

  const nextState = produce(currentState, (draftState) => {
    applyActionToState(draftState, action);
  });

  eventBus.emit('stateChanged', nextState);
}

import { deleteSaveGame, saveGame } from '../engine/persistence.js';
import { initializeEngine } from '../engine/narrativeEngine.js';
import { createInitialGameState } from './initialState.js';

export function applyActionToState(
  state: GameState,
  action: GameAction
): void {
  if (action === GameAction.QUIT) {
    addLogMessage(state, 'Press Ctrl+C to exit the simulation.', 'info');
    return;
  }

  if (action === GameAction.NEW_GAME) {
    deleteSaveGame().then(() => {
        initializeEngine(createInitialGameState());
    });
    return;
  }

  if (action === GameAction.SAVE_AND_QUIT) {
    saveGame().then(() => {
        process.exit(0);
    });
    return;
  }

  if (state.phase === 'Win' || state.phase === 'Loss') {
    return;
  }

  if (state.phase === 'PlayerTurn') {
    handlePlayerAction(state, action);
    return;
  }

  if (state.phase === 'Inventory') {
    handleInventoryAction(state, action);
    return;
  }

  if (state.phase === 'Targeting') {
    handleTargeting(state, action);
    return;
  }

  if (state.phase === 'CombatMenu') {
    handleCombatMenuAction(state, action);
    return;
  }

  if (state.phase === 'IdentifyMenu') {
    handleIdentifyMenuAction(state, action);
    return;
  }

  if (state.phase === 'MessageLog') {
    handleMessageLogAction(state, action);
    return;
  }
}
