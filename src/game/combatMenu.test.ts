import { applyActionToState } from './updateState.js';
import { GameAction } from '../input/actions.js';
import type { GameState, Actor } from '../engine/state.js';
import { setResource, clearResources } from '../engine/resourceManager.js';

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
  log: [],
  logOffset: 0,
  currentFloor: 1,
  floorStates: new Map(),
  combatTargetId: 'enemy-1',
  selectedCombatMenuIndex: 0,
  visibleTiles: new Set<string>(),
  exploredTiles: new Set<string>(),
};

describe('Combat Menu Logic', () => {
  beforeAll(() => {
    // Mock resources if combat actions require them (e.g., loot drops)
    setResource('items', []);
  });

  afterAll(() => {
    clearResources();
  });

  it('should navigate down the menu options', () => {
    const newState = applyActionToState(
      mockGameState,
      GameAction.SELECT_NEXT_COMBAT_OPTION
    );
    expect(newState.selectedCombatMenuIndex).toBe(1);
  });

  it('should navigate up the menu options', () => {
    const stateWithSecondOptionSelected = {
      ...mockGameState,
      selectedCombatMenuIndex: 1,
    };
    const newState = applyActionToState(
      stateWithSecondOptionSelected,
      GameAction.SELECT_PREVIOUS_COMBAT_OPTION
    );
    expect(newState.selectedCombatMenuIndex).toBe(0);
  });

  it('should wrap navigation from top to bottom', () => {
    const newState = applyActionToState(
      mockGameState,
      GameAction.SELECT_PREVIOUS_COMBAT_OPTION
    );
    expect(newState.selectedCombatMenuIndex).toBe(1); // Assumes 2 options
  });

  it('should transition to EnemyTurn when "Attack" is confirmed', () => {
    const newState = applyActionToState(
      mockGameState,
      GameAction.CONFIRM_COMBAT_ACTION
    );
    expect(newState.phase).toBe('EnemyTurn');
    const updatedEnemy = newState.actors.find((a: Actor) => a.id === 'enemy-1');
    expect(updatedEnemy?.hp.current).toBeLessThan(mockEnemy.hp.current);
  });

  it('should transition to PlayerTurn when "Cancel" is confirmed', () => {
    const stateWithCancelSelected = {
      ...mockGameState,
      selectedCombatMenuIndex: 1,
    };
    const newState = applyActionToState(
      stateWithCancelSelected,
      GameAction.CONFIRM_COMBAT_ACTION
    );
    expect(newState.phase).toBe('PlayerTurn');
    expect(newState.combatTargetId).toBeUndefined();
  });

  it('should transition to PlayerTurn when combat is canceled directly', () => {
    const newState = applyActionToState(mockGameState, GameAction.CANCEL_COMBAT);
    expect(newState.phase).toBe('PlayerTurn');
    expect(newState.combatTargetId).toBeUndefined();
  });
});