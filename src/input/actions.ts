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
  START_INTERACTION,
  CANCEL_TARGETING,
  USE_ITEM,
  PICKUP_ITEM,

  // Inventory
  OPEN_INVENTORY,
  CLOSE_INVENTORY,
  SELECT_NEXT_ITEM,
  SELECT_PREVIOUS_ITEM,
  CONFIRM_SELECTION,
  DROP_ITEM,
  EQUIP_ITEM,

  // Combat Menu
  SELECT_NEXT_COMBAT_OPTION,
  SELECT_PREVIOUS_COMBAT_OPTION,
  CONFIRM_COMBAT_ACTION,
  CANCEL_COMBAT,

  // Narrative
  COMMIT,
  CHECKOUT_BRANCH,

  // System
  QUIT,
  OPEN_MENU,
  NEW_GAME,
  LOAD_GAME,
  SAVE_AND_QUIT,

  // Message Log
  OPEN_MESSAGE_LOG,
  CLOSE_MESSAGE_LOG,
  SCROLL_LOG_UP,
  SCROLL_LOG_DOWN,

  // Dialogue
  SELECT_NEXT_CHOICE,
  SELECT_PREVIOUS_CHOICE,
  CONFIRM_CHOICE,

  // Theming
  CYCLE_THEME,
}