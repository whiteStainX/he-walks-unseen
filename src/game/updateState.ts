import { GameState } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { handleInventoryAction } from './inventoryActions.js';
import { handleTargeting } from './targetingActions.js';
import { handleCombatMenuAction } from './combatMenuActions.js';
import { handleIdentifyMenuAction } from './identifyActions.js';
import { handleMessageLogAction } from './messageLogActions.js';
import { handlePlayerAction } from './playerActions.js';
import { handleDialogueAction } from './dialogueActions.js';
import { addLogMessage } from './logger.js';
import { eventBus } from '../engine/events.js';
import { getCurrentState } from '../engine/narrativeEngine.js';
import { produce } from 'immer';
import { themes } from '../themes.js';

export function updateState(action: GameAction, payload?: any): void {
  if (action === GameAction.CHOOSE_THEME_AND_START) {
    const theme = payload as ThemeName;
    deleteSaveGame().then(() => {
      const baseState = createInitialGameState({ theme });
      const newGameState: GameState = { ...baseState, phase: 'PlayerTurn' };
      initializeEngine(newGameState);
      eventBus.emit('stateChanged', newGameState);
    });
    return;
  }

  if (action === GameAction.NEW_GAME) {
    // This is a special case that replaces the entire state.
    // It's handled outside the normal produce -> applyActionToState flow.
    deleteSaveGame().then(() => {
      const baseState = createInitialGameState();
      const newGameState: GameState = { ...baseState, phase: 'PlayerTurn' };
      initializeEngine(newGameState);
      eventBus.emit('stateChanged', newGameState);
    });
    return;
  }

  if (action === GameAction.LOAD_GAME) {
    loadGame().then((savedState: GameState | null) => {
      if (savedState) {
        initializeEngine(savedState);
        eventBus.emit('stateChanged', savedState);
      } else {
        const currentState = getCurrentState();
        if (currentState) {
          const nextState = produce(currentState, (draft) => {
            addLogMessage(draft, 'No saved game found.', 'info');
          });
          eventBus.emit('stateChanged', nextState);
        }
      }
    });
    return;
  }

  const currentState = getCurrentState();
  if (!currentState) return;

  const nextState = produce(currentState, (draftState) => {
    applyActionToState(draftState, action, payload);
  });

  eventBus.emit('stateChanged', nextState);
}

import { deleteSaveGame, saveGame, loadGame } from '../engine/persistence.js';
import { initializeEngine } from '../engine/narrativeEngine.js';
import { createInitialGameState } from './initialState.js';

export function applyActionToState(
  state: GameState,
  action: GameAction,
  payload?: any
): void {
  if (action === GameAction.QUIT) {
    addLogMessage(state, 'Press Ctrl+C to exit the simulation.', 'info');
    return;
  }

  if (action === GameAction.SAVE_AND_QUIT) {
    saveGame().then(() => {
        process.exit(0);
    });
    return;
  }

  if (action === GameAction.CYCLE_THEME) {
    const themeNames = Object.keys(themes);
    const currentIndex = themeNames.indexOf(state.activeTheme);
    const nextIndex = (currentIndex + 1) % themeNames.length;
    state.activeTheme = themeNames[nextIndex];
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

  if (state.phase === 'Dialogue') {
    handleDialogueAction(state, action);
    return;
  }
}
