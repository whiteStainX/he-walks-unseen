import type { GameState, Item, Actor } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { applyEffect } from './itemEffects.js';
import { equip } from './equipment.js';

export const getDisplayName = (item: Item) =>
  item.identified === false && item.unidentifiedName
    ? item.unidentifiedName
    : item.name;

export function processItemConsumption(
  stateAfterEffect: GameState,
  itemUsed: Item,
  effectMessage: string
): { finalActors: Actor[]; finalMessage: string } {
  const wasUnidentified = itemUsed.identified === false;
  const displayNameWhenUsed = getDisplayName(itemUsed);

  const playerFromNewState = stateAfterEffect.actors.find((a) => a.isPlayer)!;

  let finalMessage = effectMessage;
  let inventoryToProcess = [...playerFromNewState.inventory!];

  if (wasUnidentified) {
    finalMessage = `You use the ${displayNameWhenUsed}. It is a ${itemUsed.name}! ${effectMessage}`;
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
    ...playerFromNewState,
    inventory: finalInventory,
  };
  const finalActors = stateAfterEffect.actors.map((a) =>
    a.id === playerFromNewState.id ? playerWithNewInventory : a
  );

  return { finalActors, finalMessage };
}

export function handleInventoryAction(
  state: GameState,
  action: GameAction
): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player || !player.inventory || player.inventory.length === 0) {
    return {
      ...state,
      phase: 'PlayerTurn',
      selectedItemIndex: undefined,
      message: 'Your inventory is empty.',
      messageType: 'info',
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
        message: '',
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
        return {
          ...state,
          message: `You can't use the ${getDisplayName(itemToUse!)}.`, // eslint-disable-line @typescript-eslint/no-non-null-assertion
          messageType: 'info',
        };
      }

      const effect = itemToUse.effects[0];

      if (effect.type === 'identify') {
        return {
          ...state,
          phase: 'IdentifyMenu',
          pendingItem: itemToUse,
          selectedItemIndex: 0,
          message: 'Select an item to identify.',
          messageType: 'info',
        };
      }

      if (effect.requiresTarget) {
        return {
          ...state,
          phase: 'Targeting',
          pendingItem: itemToUse,
          message: 'Which direction?',
          messageType: 'info',
        };
      }

      const { state: stateAfterEffect, message: effectMessage } = applyEffect(
        player,
        state,
        effect
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
        selectedItemIndex: undefined,
        message: finalMessage,
        messageType: 'info',
      };
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

      return {
        ...state,
        actors: finalActorsDropping,
        items: [...state.items, droppedItem],
        phase: 'EnemyTurn',
        selectedItemIndex: undefined,
        message: `You drop the ${getDisplayName(itemToDrop)}.`, 
        messageType: 'info',
      };
    }

    case GameAction.EQUIP_ITEM: {
      const selectedDisplayName = groupedInventory[newIndex];
      if (!selectedDisplayName) return state;

      const itemToEquip = player.inventory.find(
        (item) => getDisplayName(item) === selectedDisplayName
      );
      if (!itemToEquip || !itemToEquip.equipment) {
        return {
          ...state,
          message: `You can't equip the ${getDisplayName(itemToEquip!)}.`,// eslint-disable-line @typescript-eslint/no-non-null-assertion
          messageType: 'info',
        };
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
