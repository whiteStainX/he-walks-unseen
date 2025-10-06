import type {
  Actor,
  GameState,
  ItemEffect,
  HealEffect,
  DamageEffect,
  FireballEffect,
  Point,
} from '../engine/state.js';
import { addLogMessage } from './logger.js';

function resolveHeal(
  target: Actor,
  state: GameState,
  effect: HealEffect
): GameState {
  const amountHealed = Math.min(
    target.hp.max - target.hp.current,
    effect.potency
  );
  const newHp = target.hp.current + amountHealed;

  const newTarget = { ...target, hp: { ...target.hp, current: newHp } };
  const newActors = state.actors.map((a) =>
    a.id === newTarget.id ? newTarget : a
  );

  const message =
    amountHealed > 0
      ? `The ${target.name} heals for ${amountHealed} HP.`
      : `The ${target.name} is already at full health.`;

  const stateWithActors = { ...state, actors: newActors };
  return addLogMessage(stateWithActors, message, 'heal');
}

function resolveDamage(
  target: Actor,
  state: GameState,
  effect: DamageEffect
): GameState {
  // This will be expanded later to include combat calculations
  const newHp = target.hp.current - effect.potency;
  const newTarget = { ...target, hp: { ...target.hp, current: newHp } };
  const newActors = state.actors.map((a) =>
    a.id === newTarget.id ? newTarget : a
  );
  const message = `The ${target.name} takes ${effect.potency} damage.`;

  const stateWithActors = { ...state, actors: newActors };
  return addLogMessage(stateWithActors, message, 'damage');
}

function resolveFireball(
  targetPosition: Point,
  state: GameState,
  effect: FireballEffect
): GameState {
  let newActors = [...state.actors];
  const affectedActors: Actor[] = [];
  const { radius, potency } = effect;

  for (const actor of state.actors) {
    const dx = actor.position.x - targetPosition.x;
    const dy = actor.position.y - targetPosition.y;
    if (dx * dx + dy * dy <= radius * radius) {
      affectedActors.push(actor);
    }
  }

  for (const target of affectedActors) {
    const newHp = target.hp.current - potency;
    const newTarget = { ...target, hp: { ...target.hp, current: newHp } };
    newActors = newActors.map((a) => (a.id === newTarget.id ? newTarget : a));
  }

  const message = `A fireball explodes, engulfing the area in flames!`;
  const stateWithActors = { ...state, actors: newActors };
  return addLogMessage(stateWithActors, message, 'damage');
}

function resolveRevealMap(state: GameState): GameState {
  const newExploredTiles = new Set(state.exploredTiles);
  for (let y = 0; y < state.map.height; y++) {
    for (let x = 0; x < state.map.width; x++) {
      if (!state.map.tiles[y][x].walkable) {
        // You can choose to reveal walls or not
        // For now, let's reveal everything
      }
      newExploredTiles.add(`${x},${y}`);
    }
  }
  const message = 'The scroll reveals the entire map!';
  const stateWithTiles = { ...state, exploredTiles: newExploredTiles };
  return addLogMessage(stateWithTiles, message, 'info');
}

export function applyEffect(
  user: Actor,
  state: GameState,
  effect: ItemEffect,
  target?: Point
): GameState {
  switch (effect.type) {
    case 'heal':
      return resolveHeal(user, state, effect);
    case 'damage':
      // For now, damage effects target the user unless a target is specified.
      // This could be changed based on game design.
      const damageTarget = target
        ? state.actors.find(
            (a) => a.position.x === target.x && a.position.y === target.y
          )
        : user;
      if (damageTarget) {
        return resolveDamage(damageTarget, state, effect);
      }
      return addLogMessage(state, 'Invalid target.', 'info');
    case 'fireball':
      if (target) {
        return resolveFireball(target, state, effect);
      }
      return addLogMessage(state, 'A target is required for the fireball.', 'info');
    case 'revealMap':
      return resolveRevealMap(state);
    // Other effects like applyStatus will be added here
    default:
      return addLogMessage(state, 'Unknown effect.', 'info');
  }
}