import type { GameState } from '../engine/state.js';
import { runEnemyTurn } from './ai.js';
import { processStatusEffects } from './statusEffects.js';
import { addLogMessage } from './logger.js';

function handleEnemyTurns(state: GameState): GameState {
  const enemies = state.actors.filter((a) => !a.isPlayer);
  let stateAfterEnemyTurns = state;

  for (const enemy of enemies) {
    if (stateAfterEnemyTurns.actors.find((a) => a.id === enemy.id)) {
      stateAfterEnemyTurns = runEnemyTurn(enemy, stateAfterEnemyTurns);
    }
  }

  // Process status effects for all actors at the end of the round
  const stateAfterEffects = processStatusEffects(stateAfterEnemyTurns);

  // Check for player death after status effects have been processed
  const player = stateAfterEffects.actors.find((a) => a.isPlayer);
  if (!player || player.hp.current <= 0) {
    // The processStatusEffects function might have already set the 'Loss' phase
    if (stateAfterEffects.phase === 'Loss') {
      return stateAfterEffects;
    }

    const stateWithDefeatMessage = addLogMessage(
      stateAfterEffects,
      'You have been defeated.',
      'death'
    );

    return {
      ...stateWithDefeatMessage,
      phase: 'Loss',
    };
  }

  return { ...stateAfterEffects, phase: 'PlayerTurn' };
}

export function processEnemyTurns(state: GameState): GameState {
  if (state.phase !== 'EnemyTurn') {
    return state;
  }
  return handleEnemyTurns(state);
}
