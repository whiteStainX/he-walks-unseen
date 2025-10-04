import { describe, it, expect } from '@jest/globals';
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

describe('resolveAction in Targeting phase', () => {
  const phase = 'Targeting';

  it('should return MOVE_NORTH for "w" input', () => {
    expect(resolveAction('w', createKey(), phase)).toBe(GameAction.MOVE_NORTH);
  });

  it('should return MOVE_SOUTH for "s" input', () => {
    expect(resolveAction('s', createKey(), phase)).toBe(GameAction.MOVE_SOUTH);
  });

  it('should return MOVE_EAST for "d" input', () => {
    expect(resolveAction('d', createKey(), phase)).toBe(GameAction.MOVE_EAST);
  });

  it('should return MOVE_WEST for "a" input', () => {
    expect(resolveAction('a', createKey(), phase)).toBe(GameAction.MOVE_WEST);
  });

  it('should return CANCEL_TARGETING for escape key', () => {
    expect(resolveAction('', createKey({ escape: true }), phase)).toBe(GameAction.CANCEL_TARGETING);
  });
});
