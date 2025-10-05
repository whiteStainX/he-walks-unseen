import { eventBus } from './events.js';

export type GamePhase =
  | 'MainMenu'
  | 'PlayerTurn'
  | 'EnemyTurn'
  | 'Dialogue'
  | 'Paused'
  | 'Win'
  | 'Loss'
  | 'Inventory'
  | 'Targeting'
  | 'CombatMenu'
  | 'IdentifyMenu';

export class FiniteStateMachine {
  private currentState: GamePhase;

  constructor(initialState: GamePhase) {
    this.currentState = initialState;
  }

  public getState(): GamePhase {
    return this.currentState;
  }

  public transition(newState: GamePhase): void {
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