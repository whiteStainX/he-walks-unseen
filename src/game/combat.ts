import type { Actor, GameState, MessageType } from '../engine/state.js';

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
): GameState {
  const damage = Math.max(0, attacker.attack - defender.defense);
  const newDefenderHp = defender.hp.current - damage;

  let message = `${attacker.name} attacks ${defender.name}`;
  if (damage > 0) {
    message += ` for ${damage} damage.`;
  } else {
    message += `, but it has no effect.`;
  }

  let messageType: MessageType = 'info';

  // Update the defender's HP
  let newActors = state.actors.map((actor) => {
    if (actor.id === defender.id) {
      return {
        ...actor,
        hp: { ...actor.hp, current: newDefenderHp },
      };
    }
    return actor;
  });

  // Check if the defender was defeated
  if (newDefenderHp <= 0) {
    message += ` ${defender.name} dies!`;
    newActors = newActors.filter((actor) => actor.id !== defender.id);
    messageType = 'death';
  } else {
    // Add remaining HP to the message if the defender survived
    const defenderData = newActors.find((a) => a.id === defender.id);
    if (defenderData) {
      message += ` (${defenderData.hp.current}/${defenderData.hp.max} HP left).`;
    }
    // Set message type based on who was hit
    if (damage > 0 && defender.isPlayer) {
      messageType = 'damage';
    }
  }

  return {
    ...state,
    actors: newActors,
    message,
    messageType,
  };
}