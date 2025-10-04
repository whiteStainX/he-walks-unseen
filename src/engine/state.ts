// src/engine/state.ts
export interface Point {
  x: number;
  y: number;
}

export interface Actor {
  id:string;
  name: string;
  char: string;
  color?: string;
  position: Point;
  hp: {
    current: number;
    max: number;
  };
  attack: number;
  defense: number;
  isPlayer?: true;
  inventory?: Item[];
  // Player-specific progression stats
  level?: number;
  xp?: number;
  xpToNextLevel?: number;
  // Enemy-specific XP value
  xpValue?: number;
  skills?: Skill[];
  ai?: {
    canWander?: boolean;
    canChase?: boolean;
  };
}

export interface Skill {
  id: string;
  name: string;
  description: string;
}

export interface Tile {
  char: string;
  walkable: boolean;
  transparent: boolean;
}

import type { GamePhase } from './fsm.js';

export type PotionEffect = 'heal' | 'damage';

export interface Item {
  id: string;
  name: string;
  char: string;
  color?: string;
  position: Point;
  effect: PotionEffect;
  potency: number; // e.g., how much to heal or damage
}

export type MessageType = 'info' | 'damage' | 'heal' | 'win' | 'death';

// The complete snapshot of the game world at any given moment.
export interface GameState {
  phase: GamePhase;
  actors: Actor[];
  items: Item[];
  map: {
    tiles: Tile[][]; // 2D array for map layout
    width: number;
    height: number;
  };
  message: string; // A message to display to the player (e.g., "You can't move there.")
  messageType: MessageType;
  selectedItemIndex?: number;
}