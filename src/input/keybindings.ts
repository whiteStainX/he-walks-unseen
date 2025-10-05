import type { Key } from 'ink';
import { GameAction } from './actions.js';
import type { GamePhase } from '../engine/fsm.js';

const playerTurnBindings: Record<string, GameAction> = {
  w: GameAction.MOVE_NORTH,
  s: GameAction.MOVE_SOUTH,
  d: GameAction.MOVE_EAST,
  a: GameAction.MOVE_WEST,
  g: GameAction.PICKUP_ITEM,
  i: GameAction.OPEN_INVENTORY,
  e: GameAction.START_INTERACTION,
};

const inventoryBindings: Record<string, GameAction> = {
  w: GameAction.SELECT_PREVIOUS_ITEM,
  s: GameAction.SELECT_NEXT_ITEM,
  d: GameAction.DROP_ITEM,
  e: GameAction.EQUIP_ITEM,
};

export function resolveAction(
  input: string,
  key: Key,
  phase: GamePhase
): GameAction | undefined {
  // Handle special keys first, which don't have an `input` value.
  if (phase === 'PlayerTurn') {
    if (key.upArrow) return GameAction.MOVE_NORTH;
    if (key.downArrow) return GameAction.MOVE_SOUTH;
    if (key.rightArrow) return GameAction.MOVE_EAST;
    if (key.leftArrow) return GameAction.MOVE_WEST;
  }

  if (phase === 'Inventory') {
    if (key.upArrow) return GameAction.SELECT_PREVIOUS_ITEM;
    if (key.downArrow) return GameAction.SELECT_NEXT_ITEM;
    if (key.return) return GameAction.CONFIRM_SELECTION;
    if (key.escape) return GameAction.CLOSE_INVENTORY;
  }

  if (phase === 'Targeting') {
    if (key.upArrow) return GameAction.MOVE_NORTH;
    if (key.downArrow) return GameAction.MOVE_SOUTH;
    if (key.rightArrow) return GameAction.MOVE_EAST;
    if (key.leftArrow) return GameAction.MOVE_WEST;
    if (key.escape) return GameAction.CANCEL_TARGETING; // I'll add this action next
  }

  if (phase === 'CombatMenu') {
    if (key.upArrow) return GameAction.SELECT_PREVIOUS_COMBAT_OPTION;
    if (key.downArrow) return GameAction.SELECT_NEXT_COMBAT_OPTION;
    if (key.return) return GameAction.CONFIRM_COMBAT_ACTION;
    if (key.escape) return GameAction.CANCEL_COMBAT;
  }

  if (phase === 'IdentifyMenu') {
    if (key.upArrow) return GameAction.SELECT_PREVIOUS_ITEM;
    if (key.downArrow) return GameAction.SELECT_NEXT_ITEM;
    if (key.return) return GameAction.CONFIRM_SELECTION;
    if (key.escape) return GameAction.CANCEL_TARGETING;
  }

  // Then, handle character-based input.
  if (input) {
    const normalizedInput = input.toLowerCase();

    // Global actions
    if (normalizedInput === 'q') return GameAction.QUIT;

    // Phase-specific actions
    if (phase === 'PlayerTurn') {
      return playerTurnBindings[normalizedInput];
    }
    if (phase === 'Targeting') {
      const targetingBindings: Record<string, GameAction> = {
        w: GameAction.MOVE_NORTH,
        s: GameAction.MOVE_SOUTH,
        d: GameAction.MOVE_EAST,
        a: GameAction.MOVE_WEST,
      };
      return targetingBindings[normalizedInput];
    }
    if (phase === 'Inventory') {
      return inventoryBindings[normalizedInput];
    }
    if (phase === 'CombatMenu') {
      const combatMenuBindings: Record<string, GameAction> = {
        w: GameAction.SELECT_PREVIOUS_COMBAT_OPTION,
        s: GameAction.SELECT_NEXT_COMBAT_OPTION,
      };
      return combatMenuBindings[normalizedInput];
    }
  }

  return undefined;
}
