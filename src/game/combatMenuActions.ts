import type { GameState } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { resolveAttack } from './combat.js';

const COMBAT_OPTIONS = ['Attack', 'Cancel'];

export function handleCombatMenuAction(
  state: GameState,
  action: GameAction
): void {
  const player = state.actors.find((a) => a.isPlayer);
  const targetEnemy = state.actors.find((a) => a.id === state.combatTargetId);

  if (!player || !targetEnemy) {
    // Should not happen, but as a safeguard, exit the menu
    state.phase = 'PlayerTurn';
    state.combatTargetId = undefined;
    return;
  }

  switch (action) {
    case GameAction.SELECT_PREVIOUS_COMBAT_OPTION: {
      const newIndex =
        (state.selectedCombatMenuIndex ?? 0) - 1 < 0
          ? COMBAT_OPTIONS.length - 1
          : (state.selectedCombatMenuIndex ?? 0) - 1;
      state.selectedCombatMenuIndex = newIndex;
      break;
    }
    case GameAction.SELECT_NEXT_COMBAT_OPTION: {
      const newIndex =
        ((state.selectedCombatMenuIndex ?? 0) + 1) % COMBAT_OPTIONS.length;
      state.selectedCombatMenuIndex = newIndex;
      break;
    }
    case GameAction.CANCEL_COMBAT: {
      state.phase = 'PlayerTurn';
      state.combatTargetId = undefined;
      break;
    }
    case GameAction.CONFIRM_COMBAT_ACTION: {
      const selectedOption = COMBAT_OPTIONS[state.selectedCombatMenuIndex ?? 0];
      if (selectedOption === 'Attack') {
        const stateAfterAttack = resolveAttack(player, targetEnemy, state);
        Object.assign(state, stateAfterAttack);
        state.phase = 'EnemyTurn';
        state.combatTargetId = undefined;
      } else {
        // Cancel
        state.phase = 'PlayerTurn';
        state.combatTargetId = undefined;
      }
      break;
    }
  }
}
