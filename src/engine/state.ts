// src/engine/state.ts
export interface Point {
  x: number;
  y: number;
}

export interface Actor {
  id: string;
  name: string;
  char: string;
  position: Point;
  hp: {
    current: number;
    max: number;
  };
  attack: number;
  defense: number;
  isPlayer?: true;
}

export interface Tile {
  char: string;
  walkable: boolean;
  transparent: boolean;
}

import type { GamePhase } from './fsm.js';

// The complete snapshot of the game world at any given moment.
export interface GameState {
  phase: GamePhase;
  actors: Actor[];
  map: {
    tiles: Tile[][]; // 2D array for map layout
    width: number;
    height: number;
  };
  message: string; // A message to display to the player (e.g., "You can't move there.")
}