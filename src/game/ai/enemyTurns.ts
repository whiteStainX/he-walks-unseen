
import type { Actor } from '../../engine/state.js';
import { runEnemyTurn } from './ai.js';
import { processStatusEffects } from '../combat/statusEffects.js';
import { addLogMessage } from '../../lib/logger.js';
import { eventBus } from '../../engine/events.js';
import { produce } from 'immer';
import { getCurrentState } from '../../engine/narrativeEngine.js';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function processEnemyTurns(): Promise<void> {
  const currentState = getCurrentState();
  if (!currentState || currentState.phase !== 'EnemyTurn') {
    return;
  }

  const player = currentState.actors.find((a) => a.isPlayer);
  if (!player) {
    return;
  }

  const enemies = currentState.actors.filter((a) => !a.isPlayer);

  for (const enemy of enemies) {
    const enemyInState = getCurrentState()?.actors.find((a) => a.id === enemy.id);
    if (!enemyInState) {
      continue;
    }

    const maxAp = enemyInState.actionPoints?.max ?? 1;
    let nextState = produce(getCurrentState(), (draft) => {
      if (!draft) return;
      const enemyDraft = draft.actors.find((a) => a.id === enemy.id);
      if (enemyDraft) {
        enemyDraft.actionPoints = enemyDraft.actionPoints ?? { current: maxAp, max: maxAp };
        enemyDraft.actionPoints.max = enemyDraft.actionPoints.max ?? maxAp;
        enemyDraft.actionPoints.current = enemyDraft.actionPoints.max;
      }
    });
    if (nextState) {
      eventBus.emit('stateChanged', nextState);
    }

    const ap = getCurrentState()?.actors.find(a => a.id === enemy.id)?.actionPoints?.current ?? 0;

    for (let i = 0; i < ap; i++) {
      nextState = produce(getCurrentState(), (draft) => {
        if (!draft) return;
        const enemyDraft = draft.actors.find((a) => a.id === enemy.id);
        if (enemyDraft) {
          const actionTaken = runEnemyTurn(enemyDraft, draft);
          if (!actionTaken) {
            enemyDraft.actionPoints!.current = 0;
          } else {
            enemyDraft.actionPoints!.current -= 1;
          }
        }
      });
      if (nextState) {
        eventBus.emit('stateChanged', nextState);
      }

      const player = getCurrentState()?.actors.find((a) => a.isPlayer);
      if (!player || player.hp.current <= 0) {
        break;
      }

      if (!getCurrentState()?.actors.find((a) => a.id === enemy.id)) {
        break;
      }
      await delay(200);
    }
  }

  const finalState = produce(getCurrentState(), (draft) => {
    if (!draft) return;
    processStatusEffects(draft);

    const updatedPlayer = draft.actors.find((a) => a.isPlayer);
    if (!updatedPlayer || updatedPlayer.hp.current <= 0) {
      if ((draft.phase as string) !== 'Loss') {
        addLogMessage(draft, 'You have been defeated.', 'death');
      }
      draft.phase = 'Loss';
      return;
    }

    updatedPlayer.actionPoints = updatedPlayer.actionPoints ?? { current: 0, max: 0 };
    updatedPlayer.actionPoints.current = updatedPlayer.actionPoints.max;

    const currentTarget: Actor | undefined = draft.combatTargetId
      ? draft.actors.find((a) => a.id === draft.combatTargetId)
      : undefined;

    if (currentTarget && currentTarget.hp.current > 0) {
      draft.phase = 'CombatMenu';
      return;
    }

    draft.combatTargetId = undefined;
    draft.phase = 'PlayerTurn';
  });

  if (finalState) {
    eventBus.emit('stateChanged', finalState);
  }
}
