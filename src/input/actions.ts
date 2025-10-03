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

  // Narrative
  COMMIT,
  CHECKOUT_BRANCH,

  // System
  QUIT,
  OPEN_MENU,
}