import type { Actor, GameState, Skill } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { resolveAttack } from './combat.js';
import { addLogMessage } from '../lib/logger.js';
import { getResource } from '../engine/resourceManager.js';

export interface CombatAction {
  id: string;
  name: string;
  apCost: number;
  effect: any; // Define a proper effect type later
}

export function getAvailableCombatActions(player: Actor): CombatAction[] {
  const combatActions = getResource<Record<string, CombatAction>>('combatActions');
  const allSkills = getResource<Record<string, Skill>>('skills');

  const availableActions: CombatAction[] = [combatActions.attack, combatActions.defend, combatActions.flee];

  if (player.learnedSkills) {
    for (const skillId in player.learnedSkills) {
      const skill = allSkills[skillId];
      if (skill?.type === 'active' && skill.combatActionId) {
        const action = combatActions[skill.combatActionId];
        if (action) {
          availableActions.push(action);
        }
      }
    }
  }

  return availableActions;
}

export function handleCombatMenuAction(
  state: GameState,
  action: GameAction
): void {
  const player = state.actors.find((a) => a.isPlayer);
  const targetEnemy = state.actors.find((a) => a.id === state.combatTargetId);

  if (!player || !targetEnemy || !player.actionPoints) {
    state.phase = 'PlayerTurn';
    state.combatTargetId = undefined;
    return;
  }

  const availableActions = getAvailableCombatActions(player);

  switch (action) {
    case GameAction.SELECT_PREVIOUS_COMBAT_OPTION: {
      const newIndex =
        (state.selectedCombatMenuIndex ?? 0) - 1 < 0
          ? availableActions.length - 1
          : (state.selectedCombatMenuIndex ?? 0) - 1;
      state.selectedCombatMenuIndex = newIndex;
      break;
    }
    case GameAction.SELECT_NEXT_COMBAT_OPTION: {
      const newIndex =
        ((state.selectedCombatMenuIndex ?? 0) + 1) % availableActions.length;
      state.selectedCombatMenuIndex = newIndex;
      break;
    }
    case GameAction.CANCEL_COMBAT: {
      state.phase = 'PlayerTurn';
      state.combatTargetId = undefined;
      break;
    }
    case GameAction.CONFIRM_COMBAT_ACTION: {
      const selectedAction = availableActions[state.selectedCombatMenuIndex ?? 0];

      if (player.actionPoints.current < selectedAction.apCost) {
        addLogMessage(state, `Not enough AP for ${selectedAction.name}.`, 'info');
        return;
      }

      player.actionPoints.current -= selectedAction.apCost;

      // Action Resolution Logic (to be implemented in Phase 3)
      switch (selectedAction.id) {
        case 'attack':
          resolveAttack(player, targetEnemy, state);
          break;
        case 'defend':
          addLogMessage(state, 'You brace for impact.', 'info');
          break;
        case 'flee':
          addLogMessage(state, 'You attempt to flee.', 'info');
          state.phase = 'PlayerTurn';
          state.combatTargetId = undefined;
          return;
        default:
          addLogMessage(state, `You use ${selectedAction.name}!`, 'info');
          break;
      }

      if (player.actionPoints.current <= 0 || state.combatTargetId === undefined) {
        state.phase = 'EnemyTurn';
        state.combatTargetId = undefined;
      }
      break;
    }
  }
}
