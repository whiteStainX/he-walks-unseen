import type { GameState } from '../engine/state.js';
import { runEnemyTurn } from './ai.js';
import { processStatusEffects } from './statusEffects.js';
import { addLogMessage } from '../lib/logger.js';;

export function processEnemyTurns(state: GameState): void {
  if (state.phase !== 'EnemyTurn') {
    return;
  }

  const enemies = state.actors.filter((a) => !a.isPlayer);

  for (const enemy of enemies) {
    // Check if the enemy is still alive before its turn
    if (state.actors.find((a) => a.id === enemy.id)) {
      runEnemyTurn(enemy, state);
    }
  }

  // Process status effects for all actors at the end of the round
  processStatusEffects(state);

  // Check for player death after status effects have been processed
  const player = state.actors.find((a) => a.isPlayer);
  if (!player || player.hp.current <= 0) {
    // The processStatusEffects function might have already set the 'Loss' phase
    if (state.phase !== 'Loss') {
      addLogMessage(state, 'You have been defeated.', 'death');
      state.phase = 'Loss';
    }
    return;
  }

  if (player) {
    player.actionPoints = player.actionPoints ?? { current: 0, max: 0 };
    player.actionPoints.current = player.actionPoints.max;
  }

  // Only transition to PlayerTurn if not in a UI-driven phase
  if (
    state.phase !== 'Inventory' &&
    state.phase !== 'Targeting' &&
    state.phase !== 'CombatMenu' &&
    state.phase !== 'IdentifyMenu' &&
    state.phase !== 'MessageLog' &&
    state.phase !== 'Dialogue'
  ) {
    state.phase = 'PlayerTurn';
  }
}
