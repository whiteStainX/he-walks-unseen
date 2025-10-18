import type { GameState } from '../engine/state.js';
import { GameAction } from '../input/actions.js';

const SCROLL_SPEED = 1; // Number of lines to scroll at a time

export function handleMessageLogAction(
  state: GameState,
  action: GameAction
): void {
  switch (action) {
    case GameAction.SCROLL_LOG_UP: {
      state.logOffset = Math.max(0, state.logOffset - SCROLL_SPEED);
      break;
    }

    case GameAction.SCROLL_LOG_DOWN: {
      // Assuming a full-screen height of around 24, we want to prevent scrolling too far down
      const maxOffset = Math.max(0, state.log.length - 20);
      state.logOffset = Math.min(maxOffset, state.logOffset + SCROLL_SPEED);
      break;
    }

    case GameAction.CLOSE_MESSAGE_LOG:
      state.phase = 'PlayerTurn';
      break;
  }
}