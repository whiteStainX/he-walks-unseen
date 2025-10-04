/**
 * Defines the set of possible actions a player can take.
 * This contract decouples the presentation layer (key presses)
 * from the logic layer (game actions).
 */
export enum GameAction {
  // Movement
  MOVE_NORTH,
  MOVE_SOUTH,
  MOVE_EAST,
  MOVE_WEST,

  // Interaction
  INTERACT,
  USE_ITEM,
  PICKUP_ITEM,

  // Inventory
  OPEN_INVENTORY,
  CLOSE_INVENTORY,
  SELECT_NEXT_ITEM,
  SELECT_PREVIOUS_ITEM,
  CONFIRM_SELECTION,

  // Narrative
  COMMIT,
  CHECKOUT_BRANCH,

  // System
  QUIT,
  OPEN_MENU,
}