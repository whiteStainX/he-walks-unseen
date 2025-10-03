import { eventBus } from './events.js';

export type GameState = 'MainMenu' | 'Playing' | 'Dialogue' | 'Paused';

export class FiniteStateMachine {
  private currentState: GameState;

  constructor(initialState: GameState) {
    this.currentState = initialState;
  }

  public getState(): GameState {
    return this.currentState;
  }

  public transition(newState: GameState): void {
    if (this.currentState !== newState) {
      const oldState = this.currentState;
      this.currentState = newState;
      eventBus.emit('gameStateChanged', {
        from: oldState,
        to: this.currentState,
      });
    }
  }
}