import type { GameState } from '../../engine/state.js';
import type { Parcel } from '../../types/parcel.js';
import { GameAction } from '../../input/actions.js';
import { endConversation, resolveConversationParcel } from './conversation.js';
import { addLogMessage } from '../../lib/logger.js';;

interface ConversationContext {
  currentNode: Parcel['nodes'][string];
  conversationData: Parcel;
}

function getConversationContext(state: GameState): ConversationContext | null {
  if (state.phase !== 'Dialogue' || !state.conversation) {
    return null;
  }

  const { parcelId, currentNodeId } = state.conversation;
  const conversationData = resolveConversationParcel(parcelId);

  if (!conversationData) {
    console.error(
      `[conversation] Parcel "${parcelId}" was requested but is not available.`
    );
    endConversation(state, 'The thread of conversation slips away.');
    return null;
  }

  const currentNode = conversationData.nodes[currentNodeId];

  if (!currentNode) {
    console.error(
      `[conversation] Node "${currentNodeId}" does not exist in parcel "${parcelId}".`
    );
    endConversation(state, 'The other person falls silent.');
    return null;
  }

  return { conversationData, currentNode };
}

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
  const context = getConversationContext(state);
  if (!context || !state.conversation) {
    return;
  }

  const { currentNode } = context;
  const { selectedChoiceIndex } = state.conversation;

  if (currentNode.choices.length > 0) {
    const normalizedIndex =
      ((selectedChoiceIndex % currentNode.choices.length) + currentNode.choices.length) %
      currentNode.choices.length;
    const newIndex = (normalizedIndex + 1) % currentNode.choices.length;
    state.conversation.selectedChoiceIndex = newIndex;
  }
}

export function selectPreviousChoice(state: GameState): void {
  const context = getConversationContext(state);
  if (!context || !state.conversation) {
    return;
  }

  const { currentNode } = context;
  const { selectedChoiceIndex } = state.conversation;

  if (currentNode.choices.length > 0) {
    const normalizedIndex =
      ((selectedChoiceIndex % currentNode.choices.length) + currentNode.choices.length) %
      currentNode.choices.length;
    const newIndex =
      (normalizedIndex - 1 + currentNode.choices.length) %
      currentNode.choices.length;
    state.conversation.selectedChoiceIndex = newIndex;
  }
}

export function confirmChoice(state: GameState): void {
  const context = getConversationContext(state);
  if (!context || !state.conversation) {
    return;
  }

  const { conversationData, currentNode } = context;
  const { selectedChoiceIndex } = state.conversation;

  if (currentNode.choices.length === 0) {
    endConversation(state);
    return;
  }

  const clampedIndex = Math.min(
    Math.max(selectedChoiceIndex, 0),
    currentNode.choices.length - 1
  );
  const selectedChoice = currentNode.choices[clampedIndex];

  if (!selectedChoice) {
    endConversation(state, 'The conversation loses momentum.');
    return;
  }

  const targetNodeId = selectedChoice.target;
  const targetNode = conversationData.nodes[targetNodeId];

  if (targetNode) {
    state.conversation.currentNodeId = targetNodeId;
    state.conversation.selectedChoiceIndex = 0;
    if (targetNode.choices.length === 0) {
      addLogMessage(state, 'The conversation reaches its natural end.', 'info');
    }
  } else {
    console.error(
      `[conversation] Choice target "${targetNodeId}" does not exist in parcel "${state.conversation.parcelId}".`
    );
    endConversation(state, 'Their response trails off into silence.');
  }
}
