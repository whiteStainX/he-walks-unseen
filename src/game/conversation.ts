import { getResource } from '../engine/resourceManager.js';
import type { GameState } from '../engine/state.js';
import type { Parcel } from '../types/parcel.js';
import { addLogMessage } from './logger.js';

function clearConversation(state: GameState): void {
  state.conversation = undefined;
}

export function endConversation(
  state: GameState,
  message?: string
): void {
  clearConversation(state);
  state.phase = 'PlayerTurn';

  if (message) {
    addLogMessage(state, message, 'info');
  }
}

export function beginConversation(
  state: GameState,
  parcelId: string,
  speakerName?: string
): boolean {
  const conversationData = getResource(parcelId) as Parcel | undefined;

  if (!conversationData) {
    console.error(
      `[conversation] Parcel "${parcelId}" was not found in the loaded resources.`
    );
    endConversation(
      state,
      "They don't respond. It feels like their thoughts are elsewhere."
    );
    return false;
  }

  const startNode = conversationData.nodes['start'];

  if (!startNode) {
    console.error(
      `[conversation] Parcel "${parcelId}" is missing a "start" node.`
    );
    endConversation(
      state,
      'The moment passes; there is no conversation to be had.'
    );
    return false;
  }

  state.phase = 'Dialogue';
  state.conversation = {
    parcelId,
    currentNodeId: 'start',
    selectedChoiceIndex: 0,
  };

  if (speakerName) {
    addLogMessage(state, `You begin talking to ${speakerName}.`, 'info');
  } else {
    addLogMessage(state, 'You strike up a conversation.', 'info');
  }

  return true;
}
