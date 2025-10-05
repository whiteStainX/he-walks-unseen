import type { GameState } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { resolveAttack } from './combat.js';

const COMBAT_OPTIONS = ['Attack', 'Cancel'];

export function handleCombatMenuAction(
  state: GameState,
  action: GameAction
): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  const targetEnemy = state.actors.find((a) => a.id === state.combatTargetId);

  if (!player || !targetEnemy) {
    // Should not happen, but as a safeguard, exit the menu
    return { ...state, phase: 'PlayerTurn', combatTargetId: undefined };
  }

  switch (action) {
    case GameAction.SELECT_PREVIOUS_COMBAT_OPTION: {
      const newIndex =
        (state.selectedCombatMenuIndex ?? 0) - 1 < 0
          ? COMBAT_OPTIONS.length - 1
          : (state.selectedCombatMenuIndex ?? 0) - 1;
      return { ...state, selectedCombatMenuIndex: newIndex };
    }
    case GameAction.SELECT_NEXT_COMBAT_OPTION: {
      const newIndex =
        ((state.selectedCombatMenuIndex ?? 0) + 1) % COMBAT_OPTIONS.length;
      return { ...state, selectedCombatMenuIndex: newIndex };
    }
    case GameAction.CANCEL_COMBAT: {
      return {
        ...state,
        phase: 'PlayerTurn',
        combatTargetId: undefined,
        message: '',
      };
    }
    case GameAction.CONFIRM_COMBAT_ACTION: {
      const selectedOption = COMBAT_OPTIONS[state.selectedCombatMenuIndex ?? 0];
      if (selectedOption === 'Attack') {
        const stateAfterAttack = resolveAttack(player, targetEnemy, state);
        return {
          ...stateAfterAttack,
          phase: 'EnemyTurn',
          combatTargetId: undefined,
        };
      } else {
        // Cancel
        return {
          ...state,
          phase: 'PlayerTurn',
          combatTargetId: undefined,
          message: '',
        };
      }
    }
    default:
      return state;
  }
}
