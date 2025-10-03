import type { Key } from 'ink';
import { GameAction } from './actions.js';

const characterBindings: Record<string, GameAction> = {
  w: GameAction.MOVE_NORTH,
  s: GameAction.MOVE_SOUTH,
  d: GameAction.MOVE_EAST,
  a: GameAction.MOVE_WEST,
  q: GameAction.QUIT,
};

export function resolveAction(input: string, key: Key): GameAction | undefined {
  const normalizedInput = input.toLowerCase();

  if (normalizedInput && characterBindings[normalizedInput]) {
    return characterBindings[normalizedInput];
  }

  if (key.upArrow) {
    return GameAction.MOVE_NORTH;
  }

  if (key.downArrow) {
    return GameAction.MOVE_SOUTH;
  }

  if (key.rightArrow) {
    return GameAction.MOVE_EAST;
  }

  if (key.leftArrow) {
    return GameAction.MOVE_WEST;
  }

  return undefined;
}
