import { nanoid } from 'nanoid';
import { checkForLevelUp } from './progression.js';
import type { Actor, Ai, GameState, MessageType, Item } from '../engine/state.js';
import { getResource } from '../engine/resourceManager.js';
import { getActorStats } from './equipment.js';

/**
 * Calculates the damage dealt in an attack.
 * @param attacker The actor initiating the attack.
 * @param defender The actor being attacked.
 * @returns The amount of damage dealt.
 */
export function calculateDamage(attacker: Actor, defender: Actor): number {
  const attackerStats = getActorStats(attacker);
  const defenderStats = getActorStats(defender);

  const powerStrikeBonus = attacker.skills?.some((s) => s.id === 'power-strike')
    ? 1
    : 0;
  const totalAttack = attackerStats.attack + powerStrikeBonus;
  const damage = Math.max(0, totalAttack - defenderStats.defense);
  return damage;
}

/**
 * Resolves an attack between two actors, updating the game state.
 * @param attacker The actor initiating the attack.
 * @param defender The actor being attacked.
 * @param state The current game state.
 * @returns The new game state after the attack.
 */
export function resolveAttack(
  attacker: Actor,
  defender: Actor,
  state: GameState
): GameState {
  const damage = calculateDamage(attacker, defender);
  const newDefenderHp = defender.hp.current - damage;

  let message = `${attacker.name} attacks ${defender.name}`;
  if (damage > 0) {
    message += ` for ${damage} damage.`;
  } else {
    message += `, but it has no effect.`;
  }

  let messageType: MessageType = 'info';
  let newItems = [...state.items];

  // Update the defender's HP and check for AI state changes
  let newActors = state.actors.map((actor) => {
    if (actor.id === defender.id) {
      let updatedDefender = {
        ...actor,
        hp: { ...actor.hp, current: newDefenderHp },
      };

      // Apply on-hit status effects from the attacker's weapon
      const weapon = attacker.equipment?.weapon;
      if (weapon?.equipment?.onHit && damage > 0) {
        const { type, duration, potency, chance } = weapon.equipment.onHit;
        if (Math.random() < chance) {
          const newStatusEffect = { id: nanoid(), type, duration, potency };
          const existingEffects = updatedDefender.statusEffects ?? [];
          updatedDefender = {
            ...updatedDefender,
            statusEffects: [...existingEffects, newStatusEffect],
          };
          message += ` The ${defender.name} is poisoned!`;
        }
      }

      // If the defender is an enemy and is still alive, check for flee condition
      if (
        !updatedDefender.isPlayer &&
        updatedDefender.ai?.fleeThreshold &&
        newDefenderHp > 0
      ) {
        const hpPercentage = newDefenderHp / updatedDefender.hp.max;
        if (hpPercentage <= updatedDefender.ai.fleeThreshold) {
          // Switch to flee state
          const newAi: Ai = { ...updatedDefender.ai, state: 'flee' };
          return {
            ...updatedDefender,
            ai: newAi,
          };
        }
      }

      return updatedDefender;
    }
    return actor;
  });

  // Check if the defender was defeated
  if (newDefenderHp <= 0) {
    message += ` ${defender.name} dies!`;
    messageType = 'death';

    // If player defeated an enemy, grant XP
    if (attacker.isPlayer && defender.xpValue && defender.xpValue > 0) {
      const xpGained = defender.xpValue;
      message += ` You gain ${xpGained} XP.`;

      newActors = newActors.map((actor) => {
        if (actor.id === attacker.id) {
          return { ...actor, xp: (actor.xp ?? 0) + xpGained };
        }
        return actor;
      });
    }

    // Handle loot drops
    if (defender.loot) {
      const itemTemplates = getResource<any[]>('items');
      const lootTemplate = itemTemplates.find(i => i.id === defender.loot);
      if (lootTemplate) {
        const newItem: Item = {
          ...lootTemplate,
          id: nanoid(),
          position: defender.position,
        };
        newItems.push(newItem);
        message += ` The ${defender.name} drops a ${lootTemplate.name}.`;
      }
    }

    // Remove defeated actor
    newActors = newActors.filter((actor) => actor.id !== defender.id);
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

  const finalState = {
    ...state,
    actors: newActors,
    items: newItems,
    message,
    messageType,
  };

  if (newDefenderHp <= 0 && attacker.isPlayer) {
    return checkForLevelUp(finalState);
  }

  return finalState;
}
