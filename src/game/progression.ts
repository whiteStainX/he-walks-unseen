import type { GameState } from '../engine/state.js';
import { addLogMessage } from './logger.js';

const LEVEL_UP_HP_BONUS = 10;
const LEVEL_UP_ATTACK_BONUS = 1;
const XP_TO_NEXT_LEVEL_MULTIPLIER = 1.5;

/**
 * Checks if the player has enough XP to level up and applies the changes if so.
 * @param state The current game state.
 * @returns The new game state, potentially with an updated player actor and a level-up message.
 */
export function checkForLevelUp(state: GameState): void {
  const player = state.actors.find((a) => a.isPlayer);

  // Ensure the player and their progression stats exist
  if (!player || player.xp === undefined || player.xpToNextLevel === undefined || player.level === undefined) {
    return;
  }

  if (player.xp < player.xpToNextLevel) {
    return;
  }

  // Player has leveled up!
  player.level += 1;
  player.xp -= player.xpToNextLevel;
  player.xpToNextLevel = Math.floor(player.xpToNextLevel * XP_TO_NEXT_LEVEL_MULTIPLIER);
  player.hp.max += LEVEL_UP_HP_BONUS;
  player.hp.current = player.hp.max; // Fully heal on level up
  player.attack += LEVEL_UP_ATTACK_BONUS;
  player.skillPoints = (player.skillPoints ?? 0) + 1;

  const levelUpMessage = `You reached level ${player.level}! Your health and attack have increased. You gained 1 skill point!`;

  addLogMessage(state, levelUpMessage, 'win');

  // It's possible to level up multiple times at once, so we recursively check.
  checkForLevelUp(state);
}