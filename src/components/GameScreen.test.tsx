import { GameAction } from '../input/actions.js';
import { isActionDefined } from './GameScreen.js';

describe('isActionDefined', () => {
  it('treats MOVE_NORTH as a valid action', () => {
    expect(isActionDefined(GameAction.MOVE_NORTH)).toBe(true);
  });

  it('returns false for undefined actions', () => {
    expect(isActionDefined(undefined)).toBe(false);
  });
});
