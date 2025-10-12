import type { GameState, Skill } from '../engine/state.js';
import { getResource } from '../engine/resourceManager.js';
import { addLogMessage } from './logger.js';

export function learnSkill(state: GameState, skillId: string): boolean {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) {
    addLogMessage(state, 'Error: Player not found.', 'info');
    return false;
  }

  const allSkills = getResource<Record<string, Skill>>('skills');
  const skillToLearn = allSkills[skillId];

  if (!skillToLearn) {
    addLogMessage(state, `Error: Skill "${skillId}" not found.`, 'info');
    return false;
  }

  if ((player.learnedSkills ?? {})[skillId]) {
    addLogMessage(state, `You already know ${skillToLearn.name}.`, 'info');
    return false;
  }

  if ((player.skillPoints ?? 0) < (skillToLearn.cost ?? 0)) {
    addLogMessage(state, `Not enough skill points to learn ${skillToLearn.name}.`, 'info');
    return false;
  }

  // Check prerequisites
  if (skillToLearn.prerequisites && skillToLearn.prerequisites.length > 0) {
    for (const prereqId of skillToLearn.prerequisites) {
      if (!(player.learnedSkills ?? {})[prereqId]) {
        const prereqSkill = allSkills[prereqId];
        addLogMessage(state, `You must first learn ${prereqSkill.name} to learn ${skillToLearn.name}.`, 'info');
        return false;
      }
    }
  }

  // Learn the skill
  player.skillPoints = (player.skillPoints ?? 0) - (skillToLearn.cost ?? 0);
  player.learnedSkills = { ...(player.learnedSkills ?? {}), [skillId]: true };

  // Apply skill effects (placeholder for now)
  if (skillId === 'power-strike') {
    player.attack = (player.attack ?? 0) + 1;
  } else if (skillId === 'toughness') {
    player.hp.max = (player.hp.max ?? 0) + 5;
    player.hp.current = player.hp.max;
  }

  addLogMessage(state, `You learned ${skillToLearn.name}!`, 'info');
  return true;
}
