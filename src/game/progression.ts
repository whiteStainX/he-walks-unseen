import type { GameState, Actor, Attribute } from '../engine/state.js';
import { addLogMessage } from '../lib/logger.js';

const XP_TO_NEXT_LEVEL_MULTIPLIER = 1.5;
const ATTRIBUTE_POINTS_PER_LEVEL = 2;
const SKILL_POINTS_PER_LEVEL = 1;

const BASE_HP = 20;
const HP_PER_VITALITY = 10;
const BASE_ATTACK = 2;
const ATTACK_PER_STRENGTH = 2;

/**
 * Recalculates an actor's derived stats (like HP and attack) based on their attributes.
 * @param actor The actor to recalculate stats for.
 */
export function recalculateDerivedStats(actor: Actor): void {
  const oldMaxHp = actor.hp.max;

  actor.hp.max = BASE_HP + (actor.vitality ?? 0) * HP_PER_VITALITY;
  actor.attack = BASE_ATTACK + (actor.strength ?? 0) * ATTACK_PER_STRENGTH;

  // Heal the actor for the amount of max HP they gained
  const hpGained = actor.hp.max - oldMaxHp;
  if (hpGained > 0) {
    actor.hp.current += hpGained;
  }
  // Ensure current HP doesn't exceed new max HP
  actor.hp.current = Math.min(actor.hp.current, actor.hp.max);
}

/**
 * Checks if the player has enough XP to level up and applies the changes if so.
 * @param state The current game state.
 */
export function checkForLevelUp(state: GameState): void {
  const player = state.actors.find((a) => a.isPlayer);

  // Ensure the player and their progression stats exist
  if (
    !player ||
    player.xp === undefined ||
    player.xpToNextLevel === undefined ||
    player.level === undefined
  ) {
    return;
  }

  if (player.xp < player.xpToNextLevel) {
    return;
  }

  // Player has leveled up!
  player.level += 1;
  player.xp -= player.xpToNextLevel;
  player.xpToNextLevel = Math.floor(
    player.xpToNextLevel * XP_TO_NEXT_LEVEL_MULTIPLIER
  );
  player.attributePoints =
    (player.attributePoints ?? 0) + ATTRIBUTE_POINTS_PER_LEVEL;
  player.skillPoints = (player.skillPoints ?? 0) + SKILL_POINTS_PER_LEVEL;
  player.hp.current = player.hp.max; // Fully heal on level up

  const levelUpMessage = `You reached level ${player.level}! You gained ${ATTRIBUTE_POINTS_PER_LEVEL} attribute points and ${SKILL_POINTS_PER_LEVEL} skill point!`;

  addLogMessage(state, levelUpMessage, 'win');

  // It's possible to level up multiple times at once, so we recursively check.
  checkForLevelUp(state);
}

/**
 * Allows the player to spend an attribute point.
 * @param state The current game state.
 * @param attribute The attribute to increase.
 * @returns True if the point was spent, false otherwise.
 */
export function spendAttributePoint(
  state: GameState,
  attribute: Attribute
): boolean {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) {
    addLogMessage(state, 'Error: Player not found.', 'info');
    return false;
  }

  if ((player.attributePoints ?? 0) < 1) {
    addLogMessage(state, 'Not enough attribute points.', 'info');
    return false;
  }

  player.attributePoints = (player.attributePoints ?? 0) - 1;

  switch (attribute) {
    case 'strength':
      player.strength = (player.strength ?? 0) + 1;
      break;
    case 'dexterity':
      player.dexterity = (player.dexterity ?? 0) + 1;
      break;
    case 'intelligence':
      player.intelligence = (player.intelligence ?? 0) + 1;
      break;
    case 'vitality':
      player.vitality = (player.vitality ?? 0) + 1;
      break;
  }

  recalculateDerivedStats(player);
  addLogMessage(state, `Your ${attribute} has increased!`, 'win');
  return true;
}