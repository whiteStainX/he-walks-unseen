import { nanoid } from 'nanoid';
import type { GameState, Message, MessageType } from '../engine/state.js';

const MAX_LOG_MESSAGES = 100;

export function addLogMessage(
  state: GameState,
  text: string,
  type: MessageType
): GameState {
  const newMessage: Message = {
    id: nanoid(),
    text,
    type,
  };

  const newLog = [...state.log, newMessage];

  if (newLog.length > MAX_LOG_MESSAGES) {
    newLog.shift(); // Remove the oldest message
  }

  return {
    ...state,
    log: newLog,
    logOffset: 0, // Reset scroll to show the latest message
  };
}