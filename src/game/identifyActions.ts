import type { GameState } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { getDisplayName } from './inventoryActions.js';
import { addLogMessage } from '../lib/logger.js';;

export function handleIdentifyMenuAction(
  state: GameState,
  action: GameAction
): void {
  const player = state.actors.find((a) => a.isPlayer);
  const scroll = state.pendingItem;

  // Safeguards
  if (!player || !player.inventory || player.inventory.length === 0 || !scroll) {
    addLogMessage(state, 'Identification failed: invalid state.', 'info');
    state.phase = 'PlayerTurn';
    state.selectedItemIndex = undefined;
    state.pendingItem = undefined;
    return;
  }

  // The inventory list for identification is flat, so index maps directly.
  const inventorySize = player.inventory.length;
  let newIndex = state.selectedItemIndex ?? 0;

  switch (action) {
    case GameAction.CANCEL_TARGETING: // Re-using this action
    case GameAction.CLOSE_INVENTORY: {
      addLogMessage(state, 'You decide not to identify anything.', 'info');
      state.phase = 'PlayerTurn';
      state.selectedItemIndex = undefined;
      state.pendingItem = undefined;
      return;
    }

    case GameAction.SELECT_NEXT_ITEM:
      newIndex = (newIndex + 1) % inventorySize;
      state.selectedItemIndex = newIndex;
      return;

    case GameAction.SELECT_PREVIOUS_ITEM:
      newIndex = (newIndex - 1 + inventorySize) % inventorySize;
      state.selectedItemIndex = newIndex;
      return;

    case GameAction.CONFIRM_SELECTION: {
      const itemToIdentify = player.inventory[newIndex];
      if (!itemToIdentify) return;

      if (itemToIdentify.id === scroll.id) {
        addLogMessage(
          state,
          'You cannot identify the scroll you are using.',
          'info'
        );
        return;
      }

      if (itemToIdentify.identified !== false) {
        addLogMessage(
          state,
          `The ${getDisplayName(itemToIdentify)} is already identified.`,
          'info'
        );
        return;
      }

      const itemInInventory = player.inventory.find(item => item.id === itemToIdentify.id);
      if (itemInInventory) {
        itemInInventory.identified = true;
      }

      const scrollIndex = player.inventory.findIndex(s => s.id === scroll.id);
      if (scrollIndex !== -1) {
        player.inventory.splice(scrollIndex, 1);
      }

      const message = `The scroll flares! The ${getDisplayName(
        itemToIdentify
      )} is revealed to be a ${itemToIdentify.name}.`;

      addLogMessage(state, message, 'info');
      state.phase = 'EnemyTurn';
      state.selectedItemIndex = undefined;
      state.pendingItem = undefined;
      return;
    }
  }
}
