import React from 'react';
import { render } from 'ink-testing-library';
import { CombatMenuView } from './CombatMenuView.js';
import type { GameState, Actor } from '../engine/state.js';

const mockPlayer: Actor = {
  id: 'player',
  name: 'Player',
  char: '@',
  position: { x: 1, y: 1 },
  hp: { current: 10, max: 10 },
  attack: 5,
  defense: 2,
  isPlayer: true,
};

const mockEnemy: Actor = {
  id: 'enemy-1',
  name: 'Goblin',
  char: 'g',
  position: { x: 2, y: 1 },
  hp: { current: 5, max: 5 },
  attack: 3,
  defense: 1,
};

const mockGameState: GameState = {
  phase: 'CombatMenu',
  actors: [mockPlayer, mockEnemy],
  items: [],
  entities: [],
  map: {
    tiles: [],
    width: 10,
    height: 10,
  },
  message: '',
  messageType: 'info',
  currentFloor: 1,
  floorStates: new Map(),
  combatTargetId: 'enemy-1',
  selectedCombatMenuIndex: 0,
};

describe('CombatMenuView', () => {
  it('should render the combat menu when in the CombatMenu phase', () => {
    const { lastFrame } = render(<CombatMenuView state={mockGameState} />);
    expect(lastFrame()).toContain('Engaging: Goblin');
    expect(lastFrame()).toContain('> Attack');
    expect(lastFrame()).toContain('  Cancel');
  });

  it('should highlight the selected option', () => {
    const stateWithSecondOptionSelected = {
      ...mockGameState,
      selectedCombatMenuIndex: 1,
    };
    const { lastFrame } = render(
      <CombatMenuView state={stateWithSecondOptionSelected} />
    );
    expect(lastFrame()).toContain('  Attack');
    expect(lastFrame()).toContain('> Cancel');
  });

  it('should not render if not in the CombatMenu phase', () => {
    const stateInPlayerTurn = { ...mockGameState, phase: 'PlayerTurn' as const };
    const { lastFrame } = render(<CombatMenuView state={stateInPlayerTurn} />);
    expect(lastFrame()).toBe('');
  });
});