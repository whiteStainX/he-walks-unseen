import type { GameState, Actor } from '../../engine/state.js';
import { addLogMessage } from '../../lib/logger.js';;

/**
 * Processes all active status effects for all actors in the game state.
 * This includes applying effects (like damage) and decrementing their duration.
 *
 * @param state The current game state.
 * @returns The new game state after processing status effects.
 */
export function processStatusEffects(state: GameState): void {
  const actorsToRemove: string[] = [];

  state.actors.forEach((actor) => {
    if (!actor.statusEffects || actor.statusEffects.length === 0) {
      return;
    }

    const activeEffects: Actor['statusEffects'] = [];

    actor.statusEffects.forEach((effect) => {
      const newDuration = effect.duration - 1;
      const effectIsActive = newDuration > 0;

      switch (effect.type) {
        case 'poison':
          actor.hp.current -= effect.potency;
          addLogMessage(
            state,
            `${actor.name} takes ${effect.potency} poison damage.`,
            'damage'
          );
          break;
        case 'defending':
          // The effect of defending is handled in the combat resolution.
          // Here we just let it expire.
          break;
        case 'berserk':
          // The effect of berserk is handled in the combat resolution.
          // Here we just let it expire.
          break;
        // Other status effects can be handled here in the future
      }

      if (effectIsActive) {
        activeEffects.push({ ...effect, duration: newDuration });
      } else {
        addLogMessage(state, `${actor.name} is no longer ${effect.type}.`, 'info');
      }
    });

    actor.statusEffects = activeEffects;

    // Check for death from status effects
    if (actor.hp.current <= 0) {
      addLogMessage(state, `${actor.name} dies from the poison!`, 'death');
      actorsToRemove.push(actor.id);
    }
  });

  // Filter out any actors that died from status effects
  state.actors = state.actors.filter((actor) => !actorsToRemove.includes(actor.id));

  // If the player died, handle game over
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) {
    state.phase = 'Loss';
  }
}