import type { GameState } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { resolveAttack } from './combat.js';
import { addLogMessage } from './logger.js';

// Define basic combat actions with their AP costs
export const BASIC_COMBAT_ACTIONS = [
  { id: 'attack', name: 'Attack', apCost: 1, action: GameAction.CONFIRM_COMBAT_ACTION },
  { id: 'defend', name: 'Defend', apCost: 1, action: GameAction.DEFEND_ACTION },
  { id: 'flee', name: 'Flee', apCost: 1, action: GameAction.FLEE_ACTION },
  { id: 'cancel', name: 'Cancel', apCost: 0, action: GameAction.CANCEL_COMBAT },
];

export function handleCombatMenuAction(
  state: GameState,
  action: GameAction
): void {
  const player = state.actors.find((a) => a.isPlayer);
  const targetEnemy = state.actors.find((a) => a.id === state.combatTargetId);

  if (!player || !targetEnemy || !player.actionPoints) {
    // Should not happen, but as a safeguard, exit the menu
    state.phase = 'PlayerTurn';
    state.combatTargetId = undefined;
    return;
  }

  // For now, we'll use a simplified list of options. Later, this will be dynamic.
  const currentOptions = BASIC_COMBAT_ACTIONS;

  switch (action) {
    case GameAction.SELECT_PREVIOUS_COMBAT_OPTION: {
      const newIndex =
        (state.selectedCombatMenuIndex ?? 0) - 1 < 0
          ? currentOptions.length - 1
          : (state.selectedCombatMenuIndex ?? 0) - 1;
      state.selectedCombatMenuIndex = newIndex;
      break;
    }
    case GameAction.SELECT_NEXT_COMBAT_OPTION: {
      const newIndex =
        ((state.selectedCombatMenuIndex ?? 0) + 1) % currentOptions.length;
      state.selectedCombatMenuIndex = newIndex;
      break;
    }
    case GameAction.CANCEL_COMBAT: {
      state.phase = 'PlayerTurn';
      state.combatTargetId = undefined;
      break;
    }
    case GameAction.CONFIRM_COMBAT_ACTION: {
      const selectedOption = currentOptions[state.selectedCombatMenuIndex ?? 0];

      if (player.actionPoints.current < selectedOption.apCost) {
        addLogMessage(state, `Not enough AP for ${selectedOption.name}.`, 'info');
        return;
      }

      player.actionPoints.current -= selectedOption.apCost;

      switch (selectedOption.id) {
        case 'attack':
          resolveAttack(player, targetEnemy, state);
          break;
        case 'defend':
          // Implement defend logic: e.g., apply a status effect for defense bonus
          addLogMessage(state, 'You brace for impact.', 'info');
          break;
        case 'flee':
          // Implement flee logic: e.g., a chance to escape combat
          addLogMessage(state, 'You attempt to flee.', 'info');
          // For now, just end combat. Later, add a success chance.
          state.phase = 'PlayerTurn';
          state.combatTargetId = undefined;
          return;
        case 'cancel':
          // This should ideally be handled by GameAction.CANCEL_COMBAT directly
          // but included here for completeness if selected via confirm.
          state.phase = 'PlayerTurn';
          state.combatTargetId = undefined;
          return;
      }

      // If player has no AP left, or if the action ended combat (like flee)
      if (player.actionPoints.current <= 0 || state.combatTargetId === undefined) {
        state.phase = 'EnemyTurn';
        state.combatTargetId = undefined;
      }
      break;
    }
  }
}