import { eventBus, AttackResolvedEvent, DamageDealtEvent } from '../engine/events.js';
import type { Actor, GameState } from '../engine/state.js';

export function handleAttack(
  attacker: Actor,
  defender: Actor,
  state: GameState
): GameState {
  const powerStrikeBonus = attacker.skills?.some((s) => s.id === 'power-strike')
    ? 1
    : 0;
  const totalAttack = attacker.attack + powerStrikeBonus;

  const damage = Math.max(0, totalAttack - defender.defense);

  const attackResolvedEvent: AttackResolvedEvent = {
    attackerId: attacker.id,
    defenderId: defender.id,
    didHit: true, // For now, attacks always hit
    isCritical: false, // For now, no critical hits
  };
  eventBus.emit('attackResolved', attackResolvedEvent);

  if (damage > 0) {
    const damageDealtEvent: DamageDealtEvent = {
      targetId: defender.id,
      damage,
    };
    eventBus.emit('damageDealt', damageDealtEvent);
  }

  return state;
}