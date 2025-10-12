import React from 'react';
import { Box, Text } from 'ink';
import type { GameState } from '../engine/state.js';
import { resolveConversationParcel } from '../game/conversation.js';
import { useTheme } from '../themes.js';

interface DialogueViewProps {
  state: GameState;
}

const DialogueView: React.FC<DialogueViewProps> = ({ state }) => {
  const theme = useTheme();

  if (state.phase !== 'Dialogue' || !state.conversation) {
    return null;
  }

  const { parcelId, currentNodeId } = state.conversation;
  const conversationData = resolveConversationParcel(parcelId);

  if (!conversationData) {
    return (
      <Box>
        <Text color={theme.critical}>Error: Conversation data not found for parcel: {parcelId}</Text>
      </Box>
    );
  }

  const currentNode = conversationData.nodes[currentNodeId];

  if (!currentNode) {
    return (
      <Box>
        <Text color={theme.critical}>Error: Node not found in conversation: {currentNodeId}</Text>
      </Box>
    );
  }

  return (
    <>
      <Text color={theme.primary}>{currentNode.text}</Text>
      <Box height={1} />
      {currentNode.choices.map((choice, index) => {
        const isSelected = index === state.conversation?.selectedChoiceIndex;
        return (
          <Text key={index} color={isSelected ? theme.accent : theme.primary}>
            {isSelected ? '> ' : '  '}
            {choice.text}
          </Text>
        );
      })}
    </>
  );
};

export default DialogueView;
