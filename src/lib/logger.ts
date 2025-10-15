import { nanoid } from 'nanoid';
import type { GameState, Message, MessageType } from '../engine/state.js';

const MAX_LOG_MESSAGES = 100;

export function addLogMessage(
  state: GameState,
  text: string,
  type: MessageType
): void {
  const newMessage: Message = {
    id: nanoid(),
    text,
    type,
  };

  state.log.push(newMessage);

  if (state.log.length > MAX_LOG_MESSAGES) {
    state.log.shift(); // Remove the oldest message
  }

  state.logOffset = 0; // Reset scroll to show the latest message
}