import type { Actor, EquipmentSlot, GameState, Item } from '../engine/state.js';

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
): GameState => {
  const actor = state.actors.find(a => a.id === actorId);
  if (!actor || !actor.inventory) {
    return state;
  }

  const itemIndex = actor.inventory.findIndex(i => i.id === itemId);
  if (itemIndex === -1) {
    return state;
  }

  const itemToEquip = actor.inventory[itemIndex];
  if (!itemToEquip.equipment) {
    return state; // Not an equippable item
  }

  const { slot } = itemToEquip.equipment;

  // Create a new inventory without the equipped item
  const newInventory = [
    ...actor.inventory.slice(0, itemIndex),
    ...actor.inventory.slice(itemIndex + 1),
  ];

  // If there's already an item in the slot, move it to the inventory
  const currentlyEquippedItem = actor.equipment?.[slot];
  if (currentlyEquippedItem) {
    newInventory.push(currentlyEquippedItem);
  }

  // Create the new equipment object
  const newEquipment = {
    ...actor.equipment,
    [slot]: itemToEquip,
  };

  // Update the actor
  const newActor: Actor = {
    ...actor,
    inventory: newInventory,
    equipment: newEquipment,
  };

  // Update the game state
  return {
    ...state,
    actors: state.actors.map(a => (a.id === actorId ? newActor : a)),
    message: `You equipped the ${itemToEquip.name}.`,
    messageType: 'info',
  };
};

/**
 * Unequips an item from an actor's equipment slot.
 * @param state The current game state.
 * @param actorId The ID of the actor unequipping the item.
 * @param slot The equipment slot to unequip.
 * @returns A new game state with the item unequipped.
 */
export const unequip = (
  state: GameState,
  actorId: string,
  slot: EquipmentSlot
): GameState => {
  const actor = state.actors.find(a => a.id === actorId);
  if (!actor || !actor.equipment || !actor.equipment[slot]) {
    return state;
  }

  const itemToUnequip = actor.equipment[slot] as Item;

  // Add the unequipped item back to the inventory
  const newInventory = [...(actor.inventory || []), itemToUnequip];

  // Create the new equipment object without the unequipped item
  const newEquipment = { ...actor.equipment };
  delete newEquipment[slot];

  // Update the actor
  const newActor: Actor = {
    ...actor,
    inventory: newInventory,
    equipment: newEquipment,
  };

  // Update the game state
  return {
    ...state,
    actors: state.actors.map(a => (a.id === actorId ? newActor : a)),
    message: `You unequipped the ${itemToUnequip.name}.`,
    messageType: 'info',
  };
};