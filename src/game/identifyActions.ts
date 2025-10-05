import type { GameState } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { getDisplayName } from './inventoryActions.js';

export function handleIdentifyMenuAction(
  state: GameState,
  action: GameAction
): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  const scroll = state.pendingItem;

  // Safeguards
  if (!player || !player.inventory || player.inventory.length === 0 || !scroll) {
    return {
      ...state,
      phase: 'PlayerTurn',
      selectedItemIndex: undefined,
      pendingItem: undefined,
      message: 'Identification failed: invalid state.',
      messageType: 'info',
    };
  }

  // The inventory list for identification is flat, so index maps directly.
  const inventorySize = player.inventory.length;
  let newIndex = state.selectedItemIndex ?? 0;

  switch (action) {
    case GameAction.CANCEL_TARGETING: // Re-using this action
    case GameAction.CLOSE_INVENTORY:
      return {
        ...state,
        phase: 'PlayerTurn',
        selectedItemIndex: undefined,
        pendingItem: undefined,
        message: 'You decide not to identify anything.',
        messageType: 'info',
      };

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
        return {
          ...state,
          message: 'You cannot identify the scroll you are using.',
          messageType: 'info',
        };
      }

      if (itemToIdentify.identified !== false) {
        return {
          ...state,
          message: `The ${getDisplayName(
            itemToIdentify
          )} is already identified.`,
          messageType: 'info',
        };
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

      return {
        ...state,
        actors: newActors,
        phase: 'EnemyTurn',
        selectedItemIndex: undefined,
        pendingItem: undefined,
        message,
        messageType: 'info',
      };
    }

    default:
      return state;
  }
}
