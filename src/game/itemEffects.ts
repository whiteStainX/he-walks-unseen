import type {
  Actor,
  GameState,
  Effect,
  Point,
} from '../engine/state.js';
import { addLogMessage } from './logger.js';

function resolveHeal(
  target: Actor,
  state: GameState,
  effect: { potency: number }
): void {
  const amountHealed = Math.min(
    target.hp.max - target.hp.current,
    effect.potency
  );
  target.hp.current += amountHealed;

  const message =
    amountHealed > 0
      ? `The ${target.name} heals for ${amountHealed} HP.`
      : `The ${target.name} is already at full health.`;

  addLogMessage(state, message, 'heal');
}

function resolveDamage(
  target: Actor,
  state: GameState,
  effect: { potency: number }
): void {
  // This will be expanded later to include combat calculations
  target.hp.current -= effect.potency;
  const message = `The ${target.name} takes ${effect.potency} damage.`;

  addLogMessage(state, message, 'damage');
}

function resolveFireball(
  targetPosition: Point,
  state: GameState,
  effect: { radius: number; potency: number }
): void {
  const { radius, potency } = effect;

  for (const actor of state.actors) {
    const dx = actor.position.x - targetPosition.x;
    const dy = actor.position.y - targetPosition.y;
    if (dx * dx + dy * dy <= radius * radius) {
      actor.hp.current -= potency;
    }
  }

  const message = `A fireball explodes, engulfing the area in flames!`;
  addLogMessage(state, message, 'damage');
}

function resolveRevealMap(state: GameState): void {
  for (let y = 0; y < state.map.height; y++) {
    for (let x = 0; x < state.map.width; x++) {
      state.exploredTiles.add(`${x},${y}`);
    }
  }
  const message = 'The scroll reveals the entire map!';
  addLogMessage(state, message, 'info');
}

export function applyEffect(
  user: Actor,
  state: GameState,
  effect: Effect,
  target?: Point
): void {
  switch (effect.type) {
    case 'heal':
      resolveHeal(user, state, effect);
      return;
    case 'damage':
      // For now, damage effects target the user unless a target is specified.
      // This could be changed based on game design.
      const damageTarget = target
        ? state.actors.find(
            (a) => a.position.x === target.x && a.position.y === target.y
          )
        : user;
      if (damageTarget) {
        resolveDamage(damageTarget, state, effect);
        return;
      }
      addLogMessage(state, 'Invalid target.', 'info');
      return;
    case 'fireball':
      if (target) {
        resolveFireball(target, state, effect);
        return;
      }
      addLogMessage(state, 'A target is required for the fireball.', 'info');
      return;
    case 'revealMap':
      resolveRevealMap(state);
      return;
    // Other effects like applyStatus will be added here
    default:
      addLogMessage(state, 'Unknown effect.', 'info');
  }
}