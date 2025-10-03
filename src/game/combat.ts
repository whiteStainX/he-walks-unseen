import type { Actor, GameState } from '../engine/state.js';

/**
 * Handles an attack between two actors.
 * @param attacker The actor initiating the attack.
 * @param defender The actor being attacked.
 * @param state The current game state.
 * @returns The new game state after the attack.
 */
export function handleAttack(
  attacker: Actor,
  defender: Actor,
  state: GameState
): { newState: GameState; message: string } {
  const damage = Math.max(0, attacker.attack - defender.defense);
  const newDefenderHp = defender.hp.current - damage;

  let message = `${attacker.name} attacks ${defender.name}`;
  if (damage > 0) {
    message += ` for ${damage} damage.`;
  } else {
    message += `, but it has no effect.`;
  }

  // Update the defender's HP or remove them if they are defeated
  const newActors = state.actors
    .map((actor) => {
      if (actor.id === defender.id) {
        return {
          ...actor,
          hp: { ...actor.hp, current: newDefenderHp },
        };
      }
      return actor;
    })
    .filter((actor) => {
      // If the actor is the defender, check if they have been defeated
      if (actor.id === defender.id) {
        if (newDefenderHp <= 0) {
          message += ` ${defender.name} dies!`;
          return false; // Remove the defeated actor
        }
      }
      return true;
    });

  return {
    newState: {
      ...state,
      actors: newActors,
    },
    message,
  };
}