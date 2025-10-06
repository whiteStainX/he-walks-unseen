import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render } from 'ink-testing-library';
import { GameAction } from '../input/actions.js';
import GameScreen, { isActionDefined } from './GameScreen.js';
import { createInitialGameState } from '../game/initialState.js';
import { setResource, clearResources } from '../engine/resourceManager.js';

describe('isActionDefined', () => {
  it('treats MOVE_NORTH as a valid action', () => {
    expect(isActionDefined(GameAction.MOVE_NORTH)).toBe(true);
  });

  it('returns false for undefined actions', () => {
    expect(isActionDefined(undefined)).toBe(false);
  });
});

describe('GameScreen', () => {
  beforeEach(() => {
    // Mock resources needed by createInitialGameState
    setResource('themes', {
      'overgrown-keep': {
        floors: [1],
        map: { type: 'digger' },
        enemies: ['goblin'],
        items: ['health-potion', 'dagger'],
      },
    });
    setResource('enemies', [
      {
        id: 'goblin',
        name: 'Goblin',
        char: 'g',
        hp: { current: 5, max: 5 },
        attack: 2,
        defense: 1,
        xpValue: 10,
      },
    ]);
    setResource('items', [
      {
        id: 'health-potion',
        name: 'Health Potion',
        unidentifiedName: 'Bubbling Red Potion',
        identified: false,
      },
      { id: 'dagger', name: 'Dagger' },
    ]);
    setResource('entities', [
      { id: 'door', char: '+' },
      { id: 'chest', char: 'c' },
      { id: 'downstairs', char: '>' },
      { id: 'upstairs', char: '<' },
    ]);
  });

  afterEach(() => {
    clearResources();
  });

  it('should render the game screen without crashing', () => {
    const initialState = createInitialGameState();
    const { lastFrame, unmount } = render(
      <GameScreen initialState={initialState} />
    );
    expect(lastFrame()).toContain('Status');
    expect(lastFrame()).toContain('Equipment');
    expect(lastFrame()).toContain('Inventory');
    expect(lastFrame()).toContain('Log');
    expect(lastFrame()).toContain('Welcome to floor 1!');
    unmount();
  });

});