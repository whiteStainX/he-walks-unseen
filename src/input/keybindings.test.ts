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
  it('returns MOVE_NORTH for W input', () => {
    expect(resolveAction('w', createKey())).toBe(GameAction.MOVE_NORTH);
  });

  it('prioritizes the up arrow over its character payload', () => {
    const action = resolveAction('A', createKey({ upArrow: true }));
    expect(action).toBe(GameAction.MOVE_NORTH);
  });

  it('returns undefined when there is no matching binding', () => {
    expect(resolveAction('z', createKey())).toBeUndefined();
  });
});
