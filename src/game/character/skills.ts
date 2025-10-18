import type { GameState, Skill, Point } from '../../engine/state.js';
import { getResource } from '../../engine/resourceManager.js';
import { addLogMessage } from '../../lib/logger.js';
import { applyEffect } from '../items/itemEffects.js';

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
        addLogMessage(
          state,
          `You must first learn ${prereqSkill.name} to learn ${skillToLearn.name}.`,
          'info'
        );
        return false;
      }
    }
  }

  // Learn the skill
  player.skillPoints = (player.skillPoints ?? 0) - (skillToLearn.cost ?? 0);
  player.learnedSkills = { ...(player.learnedSkills ?? {}), [skillId]: true };

  // Apply passive skill effects
  if (skillToLearn.type === 'passive' && skillToLearn.effects) {
    for (const effect of skillToLearn.effects) {
      applyEffect(player, state, effect);
    }
  }

  addLogMessage(state, `You learned ${skillToLearn.name}!`, 'info');
  return true;
}

export function useSkill(
  state: GameState,
  skillId: string,
  target?: Point
): boolean {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) {
    addLogMessage(state, 'Error: Player not found.', 'info');
    return false;
  }

  const allSkills = getResource<Record<string, Skill>>('skills');
  const skillToUse = allSkills[skillId];

  if (!skillToUse) {
    addLogMessage(state, `Error: Skill "${skillId}" not found.`, 'info');
    return false;
  }

  if (!(player.learnedSkills ?? {})[skillId]) {
    addLogMessage(state, `You don't know ${skillToUse.name}.`, 'info');
    return false;
  }

  if (skillToUse.type !== 'active') {
    addLogMessage(state, `${skillToUse.name} is not an active skill.`, 'info');
    return false;
  }

  if ((player.actionPoints?.current ?? 0) < (skillToUse.apCost ?? 0)) {
    addLogMessage(
      state,
      `Not enough action points to use ${skillToUse.name}.`,
      'info'
    );
    return false;
  }

  // Use the skill
  player.actionPoints!.current -= skillToUse.apCost ?? 0;

  if (skillToUse.effects) {
    for (const effect of skillToUse.effects) {
      if (effect.requiresTarget && !target) {
        addLogMessage(
          state,
          `The ${skillToUse.name} skill requires a target.`,
          'info'
        );
        // In a real implementation, we would enter a targeting mode here.
        // For now, we just cancel the skill use.
        player.actionPoints!.current += skillToUse.apCost ?? 0; // refund AP
        return false;
      }
      applyEffect(player, state, effect, target);
    }
  }

  addLogMessage(state, `You use ${skillToUse.name}.`, 'info');
  return true;
}
