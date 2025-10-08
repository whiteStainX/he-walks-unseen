import type { GameState } from '../engine/state.js';
import { getResource } from '../engine/resourceManager.js';
import type { Parcel } from '../types/parcel.js';
import { GameAction } from '../input/actions.js';

export function handleDialogueAction(state: GameState, action: GameAction): void {
  switch (action) {
    case GameAction.SELECT_NEXT_CHOICE:
      selectNextChoice(state);
      break;
    case GameAction.SELECT_PREVIOUS_CHOICE:
      selectPreviousChoice(state);
      break;
    case GameAction.CONFIRM_CHOICE:
      confirmChoice(state);
      break;
  }
}

export function selectNextChoice(state: GameState): void {
  if (state.phase !== 'Dialogue' || !state.conversation) {
    return;
  }

  const { parcelId, currentNodeId, selectedChoiceIndex } = state.conversation;
  const conversationData = getResource(parcelId) as Parcel;
  const currentNode = conversationData.nodes[currentNodeId];

  if (currentNode.choices.length > 0) {
    const newIndex = (selectedChoiceIndex + 1) % currentNode.choices.length;
    state.conversation.selectedChoiceIndex = newIndex;
  }
}

export function selectPreviousChoice(state: GameState): void {
  if (state.phase !== 'Dialogue' || !state.conversation) {
    return;
  }

  const { parcelId, currentNodeId, selectedChoiceIndex } = state.conversation;
  const conversationData = getResource(parcelId) as Parcel;
  const currentNode = conversationData.nodes[currentNodeId];

  if (currentNode.choices.length > 0) {
    const newIndex =
      (selectedChoiceIndex - 1 + currentNode.choices.length) %
      currentNode.choices.length;
    state.conversation.selectedChoiceIndex = newIndex;
  }
}

export function confirmChoice(state: GameState): void {
  if (state.phase !== 'Dialogue' || !state.conversation) {
    return;
  }

  const { parcelId, currentNodeId, selectedChoiceIndex } = state.conversation;
  const conversationData = getResource(parcelId) as Parcel;
  const currentNode = conversationData.nodes[currentNodeId];
  const selectedChoice = currentNode.choices[selectedChoiceIndex];

  if (selectedChoice) {
    const targetNodeId = selectedChoice.target;
    const targetNode = conversationData.nodes[targetNodeId];

    if (targetNode) {
      state.conversation.currentNodeId = targetNodeId;
      state.conversation.selectedChoiceIndex = 0;
    } else {
      // End of conversation branch
      state.phase = 'PlayerTurn';
      state.conversation = undefined;
    }
  } else {
    // No choices, or something went wrong. End conversation.
    state.phase = 'PlayerTurn';
    state.conversation = undefined;
  }
}
