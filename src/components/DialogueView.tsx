import React from 'react';
import { Box, Text } from 'ink';
import type { GameState } from '../engine/state.js';
import { resolveConversationParcel } from '../game/conversation.js';

interface DialogueViewProps {
  state: GameState;
}

const DialogueView: React.FC<DialogueViewProps> = ({ state }) => {
  if (state.phase !== 'Dialogue' || !state.conversation) {
    return null;
  }

  const { parcelId, currentNodeId } = state.conversation;
  const conversationData = resolveConversationParcel(parcelId);

  if (!conversationData) {
    return (
      <Box>
        <Text color="red">Error: Conversation data not found for parcel: {parcelId}</Text>
      </Box>
    );
  }

  const currentNode = conversationData.nodes[currentNodeId];

  if (!currentNode) {
    return (
      <Box>
        <Text color="red">Error: Node not found in conversation: {currentNodeId}</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      alignSelf="center"
      marginTop={5}
    >
      <Text>{currentNode.text}</Text>
      <Box height={1} />
      {currentNode.choices.map((choice, index) => {
        const isSelected = index === state.conversation?.selectedChoiceIndex;
        return (
          <Text key={index} color={isSelected ? 'cyan' : 'white'}>
            {isSelected ? '> ' : '  '}
            {choice.text}
          </Text>
        );
      })}
    </Box>
  );
};

export default DialogueView;
