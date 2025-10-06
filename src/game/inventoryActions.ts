import type { GameState, Item } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { applyEffect } from './itemEffects.js';
import { equip } from './equipment.js';
import { addLogMessage } from './logger.js';

export const getDisplayName = (item: Item) =>
  item.identified === false && item.unidentifiedName
    ? item.unidentifiedName
    : item.name;

export function processItemConsumption(
  state: GameState,
  itemUsed: Item
): { stateWithConsumption: GameState; message?: string } {
  const wasUnidentified = itemUsed.identified === false;
  const displayNameWhenUsed = getDisplayName(itemUsed);

  const playerFromState = state.actors.find((a) => a.isPlayer)!;

  let message: string | undefined;
  let inventoryToProcess = [...playerFromState.inventory!];

  if (wasUnidentified) {
    message = `You use the ${displayNameWhenUsed}. It is a ${itemUsed.name}!`;
    inventoryToProcess = inventoryToProcess.map((item) => {
      if (item.name === itemUsed.name) {
        return { ...item, identified: true };
      }
      return item;
    });
  }

  const itemIndexToRemove = inventoryToProcess.findIndex(
    (item) => item.id === itemUsed.id
  );

  const finalInventory = inventoryToProcess.filter(
    (_, index) => index !== itemIndexToRemove
  );

  const playerWithNewInventory = {
    ...playerFromState,
    inventory: finalInventory,
  };

  const finalActors = state.actors.map((a) =>
    a.id === playerFromState.id ? playerWithNewInventory : a
  );

  return {
    stateWithConsumption: { ...state, actors: finalActors },
    message,
  };
}

export function handleInventoryAction(
  state: GameState,
  action: GameAction
): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player || !player.inventory || player.inventory.length === 0) {
    const stateWithMessage = addLogMessage(
      state,
      'Your inventory is empty.',
      'info'
    );
    return {
      ...stateWithMessage,
      phase: 'PlayerTurn',
      selectedItemIndex: undefined,
    };
  }

  const groupedInventory = Object.keys(
    player.inventory.reduce((acc, item) => {
      const displayName = getDisplayName(item);
      acc[displayName] = (acc[displayName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  const inventorySize = groupedInventory.length;
  let newIndex = state.selectedItemIndex ?? 0;

  switch (action) {
    case GameAction.CLOSE_INVENTORY:
      return {
        ...state,
        phase: 'PlayerTurn',
        selectedItemIndex: undefined,
      };

    case GameAction.SELECT_NEXT_ITEM:
      newIndex = (newIndex + 1) % inventorySize;
      return { ...state, selectedItemIndex: newIndex };

    case GameAction.SELECT_PREVIOUS_ITEM:
      newIndex = (newIndex - 1 + inventorySize) % inventorySize;
      return { ...state, selectedItemIndex: newIndex };

    case GameAction.CONFIRM_SELECTION: {
      const selectedDisplayName = groupedInventory[newIndex];
      if (!selectedDisplayName) return state;

      const itemToUse = player.inventory.find(
        (item) => getDisplayName(item) === selectedDisplayName
      );

      if (!itemToUse || !itemToUse.effects || itemToUse.effects.length === 0) {
        return addLogMessage(
          state,
          `You can't use the ${getDisplayName(itemToUse!)}.`, // eslint-disable-line @typescript-eslint/no-non-null-assertion
          'info'
        );
      }

      const effect = itemToUse.effects[0];

      if (effect.type === 'identify') {
        const stateWithMessage = addLogMessage(
          state,
          'Select an item to identify.',
          'info'
        );
        return {
          ...stateWithMessage,
          phase: 'IdentifyMenu',
          pendingItem: itemToUse,
          selectedItemIndex: 0,
        };
      }

      if (effect.requiresTarget) {
        const stateWithMessage = addLogMessage(
          state,
          'Which direction?',
          'info'
        );
        return {
          ...stateWithMessage,
          phase: 'Targeting',
          pendingItem: itemToUse,
        };
      }

      const stateAfterEffect = applyEffect(player, state, effect);

      const { stateWithConsumption, message: consumptionMessage } =
        processItemConsumption(stateAfterEffect, itemToUse);

      let finalState: GameState = {
        ...stateWithConsumption,
        phase: 'EnemyTurn',
        selectedItemIndex: undefined,
      };

      if (consumptionMessage) {
        finalState = addLogMessage(finalState, consumptionMessage, 'info');
      }

      return finalState;
    }

    case GameAction.DROP_ITEM: {
      const selectedDisplayName = groupedInventory[newIndex];
      if (!selectedDisplayName) return state;

      const itemToDrop = player.inventory.find(
        (item) => getDisplayName(item) === selectedDisplayName
      );
      if (!itemToDrop) return state;

      const itemIndexToRemoveDropping = player.inventory.findIndex(
        (item) => item.id === itemToDrop.id
      );

      const newInventoryDropping = player.inventory.filter(
        (_, index) => index !== itemIndexToRemoveDropping
      );

      const updatedPlayerDropping = {
        ...player,
        inventory: newInventoryDropping,
      };

      const finalActorsDropping = state.actors.map((a) =>
        a.id === player.id ? updatedPlayerDropping : a
      );

      const droppedItem = { ...itemToDrop, position: player.position };

      const finalState: GameState = {
        ...state,
        actors: finalActorsDropping,
        items: [...state.items, droppedItem],
        phase: 'EnemyTurn',
        selectedItemIndex: undefined,
      };

      return addLogMessage(
        finalState,
        `You drop the ${getDisplayName(itemToDrop)}.`,
        'info'
      );
    }

    case GameAction.EQUIP_ITEM: {
      const selectedDisplayName = groupedInventory[newIndex];
      if (!selectedDisplayName) return state;

      const itemToEquip = player.inventory.find(
        (item) => getDisplayName(item) === selectedDisplayName
      );
      if (!itemToEquip || !itemToEquip.equipment) {
        return addLogMessage(
          state,
          `You can't equip the ${getDisplayName(itemToEquip!)}.`, // eslint-disable-line @typescript-eslint/no-non-null-assertion
          'info'
        );
      }

      const stateAfterEquip = equip(state, player.id, itemToEquip.id);

      return {
        ...stateAfterEquip,
        phase: 'EnemyTurn',
        selectedItemIndex: undefined,
      };
    }

    default:
      return state;
  }
}
