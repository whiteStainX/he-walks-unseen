import type { Key } from 'ink';
import { GameAction } from './actions.js';
import { resolveAction } from './keybindings.js';

const createKey = (overrides: Partial<Key> = {}): Key => ({
  upArrow: false,
  downArrow: false,
  leftArrow: false,
  rightArrow: false,
  pageDown: false,
  pageUp: false,
  return: false,
  escape: false,
  tab: false,
  backspace: false,
  delete: false,
  shift: false,
  ctrl: false,
  meta: false,
  ...overrides,
});

describe('resolveAction', () => {
  describe('when in PlayerTurn phase', () => {
    const phase = 'PlayerTurn';

    it('returns MOVE_NORTH for W input', () => {
      expect(resolveAction('w', createKey(), phase)).toBe(GameAction.MOVE_NORTH);
    });

    it('prioritizes the up arrow over its character payload for movement', () => {
      const action = resolveAction('A', createKey({ upArrow: true }), phase);
      expect(action).toBe(GameAction.MOVE_NORTH);
    });

    it('returns OPEN_INVENTORY for i input', () => {
      expect(resolveAction('i', createKey(), phase)).toBe(
        GameAction.OPEN_INVENTORY
      );
    });

    it('returns undefined when there is no matching binding', () => {
      expect(resolveAction('z', createKey(), phase)).toBeUndefined();
    });
  });

  describe('when in Inventory phase', () => {
    const phase = 'Inventory';

    it('returns SELECT_NEXT_ITEM for s input', () => {
      expect(resolveAction('s', createKey(), phase)).toBe(
        GameAction.SELECT_NEXT_ITEM
      );
    });

    it('prioritizes the down arrow over its character payload for selection', () => {
      const action = resolveAction('A', createKey({ downArrow: true }), phase);
      expect(action).toBe(GameAction.SELECT_NEXT_ITEM);
    });

    it('returns CONFIRM_SELECTION for enter key', () => {
      expect(resolveAction('', createKey({ return: true }), phase)).toBe(
        GameAction.CONFIRM_SELECTION
      );
    });

    it('returns CLOSE_INVENTORY for escape key', () => {
      expect(resolveAction('', createKey({ escape: true }), phase)).toBe(
        GameAction.CLOSE_INVENTORY
      );
    });
  });

  it('returns SAVE_AND_QUIT action for q input regardless of phase', () => {
    expect(resolveAction('q', createKey(), 'PlayerTurn')).toBe(GameAction.SAVE_AND_QUIT);
    expect(resolveAction('q', createKey(), 'Inventory')).toBe(GameAction.SAVE_AND_QUIT);
    expect(resolveAction('q', createKey(), 'Win')).toBe(GameAction.SAVE_AND_QUIT);
  });
});
