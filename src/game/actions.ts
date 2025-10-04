import type { Point } from '../engine/state.js';

export interface MoveAction {
  type: 'move';
  actorId: string;
  target: Point;
}

export interface AttackAction {
  type: 'attack';
  attackerId: string;
  defenderId: string;
}

export interface PickupItemAction {
  type: 'pickup';
  actorId: string;
  itemId: string;
}

export interface UseItemAction {
  type: 'use';
  actorId: string;
  itemId: string;
}

export interface OpenDoorAction {
  type: 'open-door';
  actorId: string;
  doorId: string;
}

export type GameAction = MoveAction | AttackAction | PickupItemAction | UseItemAction | OpenDoorAction;
