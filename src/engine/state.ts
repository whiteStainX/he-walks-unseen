// src/engine/state.ts
export interface Point {
  x: number;
  y: number;
}

export interface Player {
  position: Point;
  hp: number;
  // Knowledge flags will be added here later to track cross-branch discoveries
}

// The complete snapshot of the game world at any given moment.
export interface GameState {
  player: Player;
  map: {
    tiles: string[][]; // 2D array for map layout
    width: number;
    height: number;
  };
  message: string; // A message to display to the player (e.g., "You can't move there.")
}