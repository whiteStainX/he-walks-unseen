import type { GameState } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { getDisplayName } from './inventoryActions.js';
import { addLogMessage } from './logger.js';

export function handleIdentifyMenuAction(
  state: GameState,
  action: GameAction
): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  const scroll = state.pendingItem;

  // Safeguards
  if (!player || !player.inventory || player.inventory.length === 0 || !scroll) {
    const stateWithoutMessage: GameState = {
      ...state,
      phase: 'PlayerTurn',
      selectedItemIndex: undefined,
      pendingItem: undefined,
    };
    return addLogMessage(
      stateWithoutMessage,
      'Identification failed: invalid state.',
      'info'
    );
  }

  // The inventory list for identification is flat, so index maps directly.
  const inventorySize = player.inventory.length;
  let newIndex = state.selectedItemIndex ?? 0;

  switch (action) {
    case GameAction.CANCEL_TARGETING: // Re-using this action
    case GameAction.CLOSE_INVENTORY: {
      const stateWithoutMessage: GameState = {
        ...state,
        phase: 'PlayerTurn',
        selectedItemIndex: undefined,
        pendingItem: undefined,
      };
      return addLogMessage(
        stateWithoutMessage,
        'You decide not to identify anything.',
        'info'
      );
    }

    case GameAction.SELECT_NEXT_ITEM:
      newIndex = (newIndex + 1) % inventorySize;
      return { ...state, selectedItemIndex: newIndex };

    case GameAction.SELECT_PREVIOUS_ITEM:
      newIndex = (newIndex - 1 + inventorySize) % inventorySize;
      return { ...state, selectedItemIndex: newIndex };

    case GameAction.CONFIRM_SELECTION: {
      const itemToIdentify = player.inventory[newIndex];
      if (!itemToIdentify) return state;

      if (itemToIdentify.id === scroll.id) {
        return addLogMessage(
          state,
          'You cannot identify the scroll you are using.',
          'info'
        );
      }

      if (itemToIdentify.identified !== false) {
        return addLogMessage(
          state,
          `The ${getDisplayName(itemToIdentify)} is already identified.`,
          'info'
        );
      }

      const newInventory = player.inventory.map((item, index) => {
        if (index === newIndex) {
          return { ...item, identified: true };
        }
        return item;
      });

      const finalInventory = newInventory.filter((s) => s.id !== scroll.id);

      const updatedPlayer = { ...player, inventory: finalInventory };
      const newActors = state.actors.map((a) =>
        a.id === player.id ? updatedPlayer : a
      );

      const message = `The scroll flares! The ${getDisplayName(
        itemToIdentify
      )} is revealed to be a ${itemToIdentify.name}.`;

      const finalState: GameState = {
        ...state,
        actors: newActors,
        phase: 'EnemyTurn',
        selectedItemIndex: undefined,
        pendingItem: undefined,
      };

      return addLogMessage(finalState, message, 'info');
    }

    default:
      return state;
  }
}
