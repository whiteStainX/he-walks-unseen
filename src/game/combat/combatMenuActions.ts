import type { Actor, GameState, Skill } from '../../engine/state.js';
import { GameAction } from '../../input/actions.js';
import { resolveAttack } from './combat.js';
import { addLogMessage } from '../../lib/logger.js';
import { getResource } from '../../engine/resourceManager.js';

export interface CombatAction {
  id: string;
  name: string;
  apCost: number;
  effect: any; // Define a proper effect type later
}

export function getAvailableCombatActions(player: Actor): CombatAction[] {
  const combatActions = getResource<Record<string, CombatAction>>('combatActions');
  const allSkills = getResource<Record<string, Skill>>('skills');

  const availableActions: CombatAction[] = [
    combatActions.attack,
    combatActions.defend,
    combatActions.flee,
  ];

  if (player.learnedSkills) {
    for (const skillId in player.learnedSkills) {
      const skill = allSkills[skillId];
      if (skill?.type === 'active') {
        const action = combatActions[skill.id];
        if (action) {
          availableActions.push(action);
        }
      }
    }
  }

  availableActions.push(combatActions.cancel); // Always allow canceling
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
    case GameAction.SELECT_PREVIOUS_COMBAT_OPTION:
      state.selectedCombatMenuIndex =
        (((state.selectedCombatMenuIndex ?? 0) - 1) + availableActions.length) %
        availableActions.length;
      break;
    case GameAction.SELECT_NEXT_COMBAT_OPTION:
      state.selectedCombatMenuIndex =
        ((state.selectedCombatMenuIndex ?? 0) + 1) % availableActions.length;
      break;
    case GameAction.CANCEL_COMBAT: {
      state.phase = 'PlayerTurn';
      state.combatTargetId = undefined;
      break;
    }
    case GameAction.CONFIRM_COMBAT_ACTION: {
      const selectedAction = availableActions[state.selectedCombatMenuIndex ?? 0];

      if (
        player.actionPoints &&
        player.actionPoints.current < selectedAction.apCost
      ) {
        addLogMessage(
          state,
          `Not enough AP for ${selectedAction.name}.`,
          'info'
        );
        return;
      }

      player.actionPoints.current -= selectedAction.apCost;

      // Action Resolution Logic (to be implemented in Phase 3)
      switch (selectedAction.id) {
        case 'attack':
          resolveAttack(player, targetEnemy, state);
          break;
        case 'cleave': {
          const cleavePotency = selectedAction.effect.potency;
          // Attack the main target
          resolveAttack(player, targetEnemy, state, cleavePotency);
          // Find and attack adjacent enemies
          const enemies = state.actors.filter(a => !a.isPlayer);
          const adjacentEnemies = enemies.filter(enemy => {
            const dx = Math.abs(player.position.x - enemy.position.x);
            const dy = Math.abs(player.position.y - enemy.position.y);
            return dx <= 1 && dy <= 1 && (dx !== 0 || dy !== 0);
          });
          adjacentEnemies.forEach(enemy => {
            if (enemy.id !== targetEnemy.id) {
              resolveAttack(player, enemy, state, cleavePotency);
            }
          });
          break;
        }
        case 'cancel':
          state.phase = 'PlayerTurn';
          state.combatTargetId = undefined;
          return; // Exit early, no turn change
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
