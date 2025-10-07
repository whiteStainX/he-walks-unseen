import type { Actor, EquipmentSlot, GameState, Item } from '../engine/state.js';
import { addLogMessage } from './logger.js';

/**
 * Calculates the total stats of an actor, including bonuses from equipped items.
 * @param actor The actor whose stats to calculate.
 * @returns The actor's total stats.
 */
export const getActorStats = (actor: Actor) => {
  const stats = {
    attack: actor.attack,
    defense: actor.defense,
  };

  if (actor.equipment) {
    for (const item of Object.values(actor.equipment)) {
      if (item?.equipment?.bonuses.attack) {
        stats.attack += item.equipment.bonuses.attack;
      }
      if (item?.equipment?.bonuses.defense) {
        stats.defense += item.equipment.bonuses.defense;
      }
    }
  }

  return stats;
};

/**
 * Equips an item from an actor's inventory.
 * @param state The current game state.
 * @param actorId The ID of the actor equipping the item.
 * @param itemId The ID of the item to equip.
 * @returns A new game state with the item equipped.
 */
export const equip = (
  state: GameState,
  actorId: string,
  itemId: string
): void => {
  const actor = state.actors.find(a => a.id === actorId);
  if (!actor || !actor.inventory) {
    return;
  }

  const itemIndex = actor.inventory.findIndex(i => i.id === itemId);
  if (itemIndex === -1) {
    return;
  }

  const itemToEquip = actor.inventory[itemIndex];
  if (!itemToEquip.equipment) {
    return; // Not an equippable item
  }

  const { slot } = itemToEquip.equipment;

  // Remove the item from inventory
  actor.inventory.splice(itemIndex, 1);

  // If there's already an item in the slot, move it to the inventory
  const currentlyEquippedItem = actor.equipment?.[slot];
  if (currentlyEquippedItem) {
    actor.inventory.push(currentlyEquippedItem);
  }

  // Equip the new item
  if (!actor.equipment) {
    actor.equipment = {};
  }
  actor.equipment[slot] = itemToEquip;

  addLogMessage(state, `You equipped the ${itemToEquip.name}.`, 'info');
};

/**
 * Unequips an item from an actor's equipment slot.
 * @param state The current game state.
 * @param actorId The ID of the actor unequipping the item.
 * @param slot The equipment slot to unequip.
 */
export const unequip = (
  state: GameState,
  actorId: string,
  slot: EquipmentSlot
): void => {
  const actor = state.actors.find(a => a.id === actorId);
  if (!actor || !actor.equipment || !actor.equipment[slot]) {
    return;
  }

  const itemToUnequip = actor.equipment[slot] as Item;

  // Add the unequipped item back to the inventory
  actor.inventory = actor.inventory || [];
  actor.inventory.push(itemToUnequip);

  // Remove the item from the equipment slot
  delete actor.equipment[slot];

  addLogMessage(state, `You unequipped the ${itemToUnequip.name}.`, 'info');
};