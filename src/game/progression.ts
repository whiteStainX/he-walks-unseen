import type { GameState, Actor } from '../engine/state.js';

const LEVEL_UP_HP_BONUS = 10;
const LEVEL_UP_ATTACK_BONUS = 1;
const XP_TO_NEXT_LEVEL_MULTIPLIER = 1.5;

/**
 * Checks if the player has enough XP to level up and applies the changes if so.
 * @param state The current game state.
 * @returns The new game state, potentially with an updated player actor and a level-up message.
 */
export function checkForLevelUp(state: GameState): GameState {
  const player = state.actors.find((a) => a.isPlayer);

  // Ensure the player and their progression stats exist
  if (!player || player.xp === undefined || player.xpToNextLevel === undefined || player.level === undefined) {
    return state;
  }

  if (player.xp < player.xpToNextLevel) {
    return state;
  }

  // Player has leveled up!
  const newLevel = player.level + 1;
  const newXp = player.xp - player.xpToNextLevel;
  const newXpToNextLevel = Math.floor(player.xpToNextLevel * XP_TO_NEXT_LEVEL_MULTIPLIER);
  const newMaxHp = player.hp.max + LEVEL_UP_HP_BONUS;
  const newAttack = player.attack + LEVEL_UP_ATTACK_BONUS;

  const newSkills = [
    ...(player.skills || []),
    {
      id: 'power-strike',
      name: 'Power Strike',
      description: 'Increases your attack by 1.',
    },
  ];

  const leveledUpPlayer: Actor = {
    ...player,
    level: newLevel,
    xp: newXp,
    xpToNextLevel: newXpToNextLevel,
    hp: {
      max: newMaxHp,
      current: newMaxHp, // Fully heal on level up
    },
    attack: newAttack,
    skills: newSkills,
  };

  const newActors = state.actors.map((actor) =>
    actor.id === player.id ? leveledUpPlayer : actor
  );

  const levelUpMessage = `You reached level ${newLevel}! Your health and attack have increased.`;

  // It's possible to level up multiple times at once, so we recursively check.
  const stateAfterLevelUp: GameState = {
    ...state,
    actors: newActors,
    message: levelUpMessage,
    messageType: 'win', // Use a distinct color for level-ups
  };

  return checkForLevelUp(stateAfterLevelUp);
}