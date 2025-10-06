import type { GameState, Actor } from '../engine/state.js';
import { addLogMessage } from './logger.js';

/**
 * Processes all active status effects for all actors in the game state.
 * This includes applying effects (like damage) and decrementing their duration.
 *
 * @param state The current game state.
 * @returns The new game state after processing status effects.
 */
export function processStatusEffects(state: GameState): GameState {
  let stateWithLogs = { ...state };

  const actorsWithUpdatedEffects = state.actors.map((actor) => {
    if (!actor.statusEffects || actor.statusEffects.length === 0) {
      return actor;
    }

    let currentHp = actor.hp.current;
    const activeEffects: Actor['statusEffects'] = [];

    actor.statusEffects.forEach((effect) => {
      const newDuration = effect.duration - 1;
      const effectIsActive = newDuration > 0;

      switch (effect.type) {
        case 'poison':
          currentHp -= effect.potency;
          stateWithLogs = addLogMessage(
            stateWithLogs,
            `${actor.name} takes ${effect.potency} poison damage.`,
            'damage'
          );
          break;
        // Other status effects can be handled here in the future
      }

      if (effectIsActive) {
        activeEffects.push({ ...effect, duration: newDuration });
      } else {
        stateWithLogs = addLogMessage(
          stateWithLogs,
          `${actor.name} is no longer poisoned.`,
          'info'
        );
      }
    });

    // Check for death from status effects
    if (currentHp <= 0) {
      stateWithLogs = addLogMessage(
        stateWithLogs,
        `${actor.name} dies from the poison!`,
        'death'
      );
    }

    return {
      ...actor,
      hp: { ...actor.hp, current: currentHp },
      statusEffects: activeEffects,
    };
  });

  // Filter out any actors that died from status effects
  const aliveActors = actorsWithUpdatedEffects.filter(
    (actor) => actor.hp.current > 0
  );

  // If the player died, handle game over
  const player = aliveActors.find((a) => a.isPlayer);
  if (!player) {
    return {
      ...stateWithLogs,
      actors: aliveActors,
      phase: 'Loss',
    };
  }

  return {
    ...stateWithLogs,
    actors: aliveActors,
  };
}