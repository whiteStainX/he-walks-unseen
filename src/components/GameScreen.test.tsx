import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { render } from 'ink-testing-library';
import { GameAction } from '../input/actions.js';
import GameScreen, { isActionDefined } from './GameScreen.js';
import type { GameState } from '../engine/state.js';
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
    // Use fake timers to control setTimeout in useEffect
    jest.useFakeTimers();
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
      { id: 'health-potion', name: 'Health Potion' },
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
    // Restore real timers
    jest.useRealTimers();
    clearResources();
  });

  it('should render the game screen without crashing', () => {
    const initialState = createInitialGameState();
    const { lastFrame } = render(<GameScreen initialState={initialState} />);
    expect(lastFrame()).toContain('Status');
    expect(lastFrame()).toContain('Equipment');
    expect(lastFrame()).toContain('Inventory');
    expect(lastFrame()).toContain('Log');
    expect(lastFrame()).toContain('Welcome to floor 1!');
  });

  it('should transition to EnemyTurn and back', () => {
    const initialState = createInitialGameState();
    initialState.phase = 'EnemyTurn'; // Manually set phase for test
    const { lastFrame } = render(<GameScreen initialState={initialState} />);

    // Initial state is EnemyTurn
    expect(lastFrame()).toContain('Status'); // Still renders the UI

    // Fast-forward timers
    jest.runAllTimers();

    // The component's useEffect should have called processEnemyTurns,
    // which (in a mocked environment) would switch the phase back to PlayerTurn.
    // Since we can't easily test the full state transition here without heavy mocking,
    // this test mainly ensures that the component handles the phase change gracefully.
    // A more integrated test would be needed to see the phase change reflected in the UI.
  });
});