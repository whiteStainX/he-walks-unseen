import type { Actor, GameState } from '../../engine/state.js';
import { runEnemyTurn } from './ai.js';
import { processStatusEffects } from '../combat/statusEffects.js';
import { addLogMessage } from '../../lib/logger.js';;

export function processEnemyTurns(state: GameState): void {
  if (state.phase !== 'EnemyTurn') {
    return;
  }

  const player = state.actors.find((a) => a.isPlayer);
  if (!player) {
    return;
  }

  const enemies = state.actors.filter((a) => !a.isPlayer);

  for (const enemy of enemies) {
    const enemyInState = state.actors.find((a) => a.id === enemy.id);
    if (!enemyInState) {
      continue;
    }

    const maxAp = enemyInState.actionPoints?.max ?? 1;
    enemyInState.actionPoints = enemyInState.actionPoints ?? { current: maxAp, max: maxAp };
    enemyInState.actionPoints.max = enemyInState.actionPoints.max ?? maxAp;
    enemyInState.actionPoints.current = enemyInState.actionPoints.max;

    while (enemyInState.actionPoints.current > 0) {
      const actionTaken = runEnemyTurn(enemyInState, state);
      if (!actionTaken) {
        enemyInState.actionPoints.current = 0;
        break;
      }

      enemyInState.actionPoints.current -= 1;

      const currentPlayer = state.actors.find((a) => a.isPlayer);
      if (!currentPlayer || currentPlayer.hp.current <= 0) {
        break;
      }

      if (!state.actors.find((a) => a.id === enemyInState.id)) {
        break;
      }
    }

    if (enemyInState.actionPoints) {
      enemyInState.actionPoints.current = 0;
    }
  }

  // Process status effects for all actors at the end of the round
  processStatusEffects(state);

  // Check for player death after status effects have been processed
  const updatedPlayer = state.actors.find((a) => a.isPlayer);
  if (!updatedPlayer || updatedPlayer.hp.current <= 0) {
    // The processStatusEffects function might have already set the 'Loss' phase
    if ((state.phase as string) !== 'Loss') {
      addLogMessage(state, 'You have been defeated.', 'death');
    }
    state.phase = 'Loss';
    return;
  }

  updatedPlayer.actionPoints = updatedPlayer.actionPoints ?? { current: 0, max: 0 };
  updatedPlayer.actionPoints.current = updatedPlayer.actionPoints.max;

  const currentTarget: Actor | undefined = state.combatTargetId
    ? state.actors.find((a) => a.id === state.combatTargetId)
    : undefined;

  if (currentTarget && currentTarget.hp.current > 0) {
    state.phase = 'CombatMenu';
    return;
  }

  state.combatTargetId = undefined;
  state.phase = 'PlayerTurn';
}
