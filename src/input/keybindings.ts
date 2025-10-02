import { GameAction } from './actions';

// This maps Ink's key object properties to our abstract GameActions.
export const keybindings: Record<string, GameAction> = {
	w: GameAction.MOVE_NORTH,
	arrowUp: GameAction.MOVE_NORTH,

	s: GameAction.MOVE_SOUTH,
	arrowDown: GameAction.MOVE_SOUTH,

	d: GameAction.MOVE_EAST,
	arrowRight: GameAction.MOVE_EAST,

	a: GameAction.MOVE_WEST,
	arrowLeft: GameAction.MOVE_WEST,

	q: GameAction.QUIT,
};