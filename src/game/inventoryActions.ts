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
): { message?: string } {
  const wasUnidentified = itemUsed.identified === false;
  const displayNameWhenUsed = getDisplayName(itemUsed);

  const playerFromState = state.actors.find((a) => a.isPlayer)!;

  let message: string | undefined;

  if (wasUnidentified) {
    message = `You use the ${displayNameWhenUsed}. It is a ${itemUsed.name}!`;
    playerFromState.inventory?.forEach((item) => {
      if (item.name === itemUsed.name) {
        item.identified = true;
      }
    });
  }

  const itemIndexToRemove = playerFromState.inventory!.findIndex(
    (item) => item.id === itemUsed.id
  );

  if (itemIndexToRemove !== -1) {
    playerFromState.inventory!.splice(itemIndexToRemove, 1);
  }

  return { message };
}

export function handleInventoryAction(
  state: GameState,
  action: GameAction
): void {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player || !player.inventory || player.inventory.length === 0) {
    addLogMessage(state, 'Your inventory is empty.', 'info');
    state.phase = 'PlayerTurn';
    state.selectedItemIndex = undefined;
    return;
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
      state.phase = 'PlayerTurn';
      state.selectedItemIndex = undefined;
      return;

    case GameAction.SELECT_NEXT_ITEM:
      newIndex = (newIndex + 1) % inventorySize;
      state.selectedItemIndex = newIndex;
      return;

    case GameAction.SELECT_PREVIOUS_ITEM:
      newIndex = (newIndex - 1 + inventorySize) % inventorySize;
      state.selectedItemIndex = newIndex;
      return;

    case GameAction.CONFIRM_SELECTION: {
      const selectedDisplayName = groupedInventory[newIndex];
      if (!selectedDisplayName) return;

      const itemToUse = player.inventory.find(
        (item) => getDisplayName(item) === selectedDisplayName
      );

      if (!itemToUse || !itemToUse.effects || itemToUse.effects.length === 0) {
        addLogMessage(state, `You can't use the ${getDisplayName(itemToUse!)}.`, 'info');
        return;
      }

      const effect = itemToUse.effects[0];

      if (effect.type === 'identify') {
        addLogMessage(state, 'Select an item to identify.', 'info');
        state.phase = 'IdentifyMenu';
        state.pendingItem = itemToUse;
        state.selectedItemIndex = 0;
        return;
      }

      if (effect.requiresTarget) {
        addLogMessage(state, 'Which direction?', 'info');
        state.phase = 'Targeting';
        state.pendingItem = itemToUse;
        return;
      }

      applyEffect(player, state, effect);

      const { message: consumptionMessage } = processItemConsumption(
        state,
        itemToUse
      );

      state.phase = 'EnemyTurn';
      state.selectedItemIndex = undefined;

      if (consumptionMessage) {
        addLogMessage(state, consumptionMessage, 'info');
      }

      return;
    }

    case GameAction.DROP_ITEM: {
      const selectedDisplayName = groupedInventory[newIndex];
      if (!selectedDisplayName) return;

      const itemToDrop = player.inventory.find(
        (item) => getDisplayName(item) === selectedDisplayName
      );
      if (!itemToDrop) return;

      const itemIndexToRemoveDropping = player.inventory.findIndex(
        (item) => item.id === itemToDrop.id
      );

      if (itemIndexToRemoveDropping !== -1) {
        player.inventory.splice(itemIndexToRemoveDropping, 1);
      }

      const droppedItem = { ...itemToDrop, position: player.position };
      state.items.push(droppedItem);

      state.phase = 'EnemyTurn';
      state.selectedItemIndex = undefined;

      addLogMessage(state, `You drop the ${getDisplayName(itemToDrop)}.`, 'info');
      return;
    }

    case GameAction.EQUIP_ITEM: {
      const selectedDisplayName = groupedInventory[newIndex];
      if (!selectedDisplayName) return;

      const itemToEquip = player.inventory.find(
        (item) => getDisplayName(item) === selectedDisplayName
      );
      if (!itemToEquip || !itemToEquip.equipment) {
        addLogMessage(state, `You can't equip the ${getDisplayName(itemToEquip!)}.`, 'info');
        return;
      }

      equip(state, player.id, itemToEquip.id);

      state.phase = 'EnemyTurn';
      state.selectedItemIndex = undefined;
      return;
    }
  }
}
