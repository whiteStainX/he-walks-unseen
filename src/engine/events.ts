import EventEmitter from 'events';

export const eventBus = new EventEmitter();

export interface AttackResolvedEvent {
  attackerId: string;
  defenderId: string;
  didHit: boolean;
  isCritical: boolean;
}

export interface DamageDealtEvent {
  targetId: string;
  damage: number;
}

export interface ActorDiedEvent {
  actorId: string;
}