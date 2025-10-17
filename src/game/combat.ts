import { nanoid } from 'nanoid';
import { checkForLevelUp } from './progression.js';
import type { Actor, GameState, MessageType } from '../engine/state.js';
import { getActorStats } from './equipment.js';
import { addLogMessage } from '../lib/logger.js';;
import { generateLoot } from './loot.js';

/**
 * Calculates the damage dealt in an attack, accounting for accuracy, evasion, critical hits, and resistances.
 * @param attacker The actor initiating the attack.
 * @param defender The actor being attacked.
 * @returns The amount of damage dealt, or null if the attack misses.
 */
export function calculateDamage(
  attacker: Actor,
  defender: Actor,
  state: GameState
): number | null {
  const attackerStats = getActorStats(attacker);
  const defenderStats = getActorStats(defender);

  // Accuracy check
  const hitChance = Math.min(
    100,
    Math.max(0, attackerStats.accuracy - defenderStats.evasion)
  );
  if (Math.random() * 100 > hitChance) {
    return null; // Attack misses
  }

  let baseDamage = 0;
  const weapon = attacker.equipment?.weapon;

  if (weapon?.equipment?.damage) {
    baseDamage =
      Math.floor(
        Math.random() *
          (weapon.equipment.damage.max - weapon.equipment.damage.min + 1)
      ) + weapon.equipment.damage.min;
  } else {
    baseDamage = attackerStats.attack; // Fallback to actor's base attack if no weapon damage defined
  }

  let totalDamage = Math.max(0, baseDamage - defenderStats.defense);

  // Apply damage resistance
  totalDamage *= 1 - defenderStats.damageResistance;

  // Critical hit chance
  if (Math.random() < attackerStats.critChance) {
    totalDamage *= attackerStats.critDamage;
    addLogMessage(state, `${attacker.name} scores a critical hit!`, 'info');
  }

  return Math.round(totalDamage);
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
): void {
  const damage = calculateDamage(attacker, defender, state);
  const defenderInState = state.actors.find((a) => a.id === defender.id)!;

  if (damage === null) {
    addLogMessage(
      state,
      `${attacker.name} attacks ${defender.name}, but misses.`,
      'info'
    );
    return;
  }

  defenderInState.hp.current -= damage;

  let message = `${attacker.name} attacks ${defender.name}`;
  if (damage > 0) {
    message += ` for ${damage} damage.`;
  } else {
    message += `, but it has no effect.`;
  }

  let messageType: MessageType = 'info';

  // Apply on-hit status effects from the attacker's weapon
  const weapon = attacker.equipment?.weapon;
  if (weapon?.equipment?.onHit && damage > 0) {
    const { type, duration, potency, chance } = weapon.equipment.onHit;
    if (Math.random() < chance) {
      const newStatusEffect = { id: nanoid(), type, duration, potency };
      defenderInState.statusEffects = defenderInState.statusEffects ?? [];
      defenderInState.statusEffects.push(newStatusEffect);
      message += ` The ${defender.name} is poisoned!`;
    }
  }

  // If the defender is an enemy and is still alive, check for flee condition
  if (
    !defenderInState.isPlayer &&
    defenderInState.ai?.fleeThreshold &&
    defenderInState.hp.current > 0
  ) {
    const hpPercentage = defenderInState.hp.current / defenderInState.hp.max;
    if (hpPercentage <= defenderInState.ai.fleeThreshold) {
      if (defenderInState.ai) {
        defenderInState.ai.state = 'flee';
      }
    }
  }

  // Check if the defender was defeated
  if (defenderInState.hp.current <= 0) {
    message += ` ${defender.name} dies!`;
    messageType = 'death';

    // If player defeated an enemy, grant XP
    if (attacker.isPlayer && defender.xpValue && defender.xpValue > 0) {
      const xpGained = defender.xpValue;
      message += ` You gain ${xpGained} XP.`;
      const attackerInState = state.actors.find(a => a.id === attacker.id)!;
      attackerInState.xp = (attackerInState.xp ?? 0) + xpGained;
    }

    // Handle loot drops
    if (defender.lootTableId) {
      const generatedItems = generateLoot(defender.lootTableId);
      for (const item of generatedItems) {
        item.position = defender.position;
        state.items.push(item);
        message += ` The ${defender.name} drops a ${item.name}.`;
      }
    }

    // Remove defeated actor
    const defenderIndex = state.actors.findIndex(a => a.id === defender.id);
    if (defenderIndex !== -1) {
      state.actors.splice(defenderIndex, 1);
    }
  } else {
    // Add remaining HP to the message if the defender survived
    message += ` (${defenderInState.hp.current}/${defenderInState.hp.max} HP left).`;
    // Set message type based on who was hit
    if (damage > 0 && defender.isPlayer) {
      messageType = 'damage';
    }
  }

  addLogMessage(state, message, messageType);

  if (defenderInState.hp.current <= 0 && attacker.isPlayer) {
    checkForLevelUp(state);
  }
}