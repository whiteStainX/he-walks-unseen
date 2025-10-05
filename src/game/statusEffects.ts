import type { GameState, Actor } from '../engine/state.js';
import { nanoid } from 'nanoid';

/**
 * Processes all active status effects for all actors in the game state.
 * This includes applying effects (like damage) and decrementing their duration.
 *
 * @param state The current game state.
 * @returns The new game state after processing status effects.
 */
export function processStatusEffects(state: GameState): GameState {
  let newActors = [...state.actors];
  let messages: string[] = [];

  newActors = newActors.map(actor => {
    if (!actor.statusEffects || actor.statusEffects.length === 0) {
      return actor;
    }

    let currentHp = actor.hp.current;
    const activeEffects: Actor['statusEffects'] = [];

    actor.statusEffects.forEach(effect => {
      let newDuration = effect.duration - 1;
      let effectIsActive = newDuration > 0;

      switch (effect.type) {
        case 'poison':
          currentHp -= effect.potency;
          messages.push(`${actor.name} takes ${effect.potency} poison damage.`);
          break;
        // Other status effects can be handled here in the future
      }

      if (effectIsActive) {
        activeEffects.push({ ...effect, duration: newDuration });
      } else {
        messages.push(`${actor.name} is no longer poisoned.`);
      }
    });

    // Check for death from status effects
    if (currentHp <= 0) {
      messages.push(`${actor.name} dies from the poison!`);
      // The actor will be removed from the game state later
    }

    return {
      ...actor,
      hp: { ...actor.hp, current: currentHp },
      statusEffects: activeEffects,
    };
  });

  // Filter out any actors that died from status effects
  const aliveActors = newActors.filter(actor => actor.hp.current > 0);

  // If the player died, handle game over
  const player = aliveActors.find(a => a.isPlayer);
  if (!player) {
    return {
      ...state,
      actors: aliveActors,
      phase: 'Loss',
      message: messages.join(' '),
      messageType: 'death',
    };
  }

  return {
    ...state,
    actors: aliveActors,
    message: messages.length > 0 ? messages.join(' ') : state.message,
    messageType: messages.length > 0 ? 'damage' : state.messageType,
  };
}