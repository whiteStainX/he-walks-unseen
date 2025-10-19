
import { render } from 'ink-testing-library';
import { CombatMenuView } from './CombatMenuView.js';
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
  actionPoints: { current: 1, max: 1 },
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
  currentMapId: 'testMap',
  mapStates: new Map(),
  combatTargetId: 'enemy-1',
  selectedCombatMenuIndex: 0,
  visibleTiles: new Set<string>(),
  exploredTiles: new Set<string>(),
  activeTheme: 'amber',
};

describe('CombatMenuView', () => {
  beforeAll(() => {
    setResource('combatActions', {
      attack: { id: 'attack', name: 'Attack', apCost: 1 },
      defend: { id: 'defend', name: 'Defend', apCost: 1 },
      flee: { id: 'flee', name: 'Flee', apCost: 1 },
      cancel: { id: 'cancel', name: 'Cancel', apCost: 0 },
    });
    setResource('skills', {});
  });

  afterAll(() => {
    clearResources();
  });

  it('should render the combat menu when in the CombatMenu phase', () => {
    const { lastFrame } = render(<CombatMenuView state={mockGameState} />);
    expect(lastFrame()).toContain('Engaging: Goblin');
    expect(lastFrame()).toContain('> Attack');
    expect(lastFrame()).toContain('  Cancel');
  });

  it('should highlight the selected option', () => {
    const stateWithThirdOptionSelected = {
      ...mockGameState,
      selectedCombatMenuIndex: 2,
    };
    const { lastFrame } = render(
      <CombatMenuView state={stateWithThirdOptionSelected} />
    );
    expect(lastFrame()).toContain('  Attack');
    expect(lastFrame()).toContain('> Flee');
  });

  it('should not render if not in the CombatMenu phase', () => {
    const stateInPlayerTurn = { ...mockGameState, phase: 'PlayerTurn' as const };
    const { lastFrame } = render(<CombatMenuView state={stateInPlayerTurn} />);
    expect(lastFrame()).toBe('');
  });

  it('should render during the enemy turn while combat is active', () => {
    const stateInEnemyTurn = { ...mockGameState, phase: 'EnemyTurn' as const };
    const { lastFrame } = render(<CombatMenuView state={stateInEnemyTurn} />);
    expect(lastFrame()).toContain('Enemy is taking actions...');
  });
});