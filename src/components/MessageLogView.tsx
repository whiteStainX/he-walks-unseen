import React from 'react';
import { Box, Text } from 'ink';
import type { GameState, Message, MessageType } from '../engine/state.js';

const getMessageColor = (messageType: MessageType) => {
  switch (messageType) {
    case 'damage':
    case 'death':
      return 'red';
    case 'heal':
    case 'win':
      return 'green';
    case 'info':
    default:
      return 'white';
  }
};

interface Props {
  log: Message[];
  logOffset: number;
  phase: GameState['phase'];
  height?: number;
}

const SIDEBAR_LOG_LENGTH = 5;

const MessageLogView: React.FC<Props> = ({
  log,
  logOffset,
  phase,
  height = SIDEBAR_LOG_LENGTH,
}) => {
  if (phase === 'MessageLog') {
    // Full-screen, scrollable view (to be implemented)
    const visibleLog = log.slice(logOffset, logOffset + height);

    return (
      <Box
        width="100%"
        flexDirection="column"
        borderStyle="round"
        borderColor="yellow"
        padding={1}
        flexGrow={1}
      >
        <Text bold>Message Log (scroll with up/down, 'l' to close)</Text>
        <Box flexDirection="column" flexGrow={1}>
          {visibleLog.map((msg) => (
            <Text key={msg.id} color={getMessageColor(msg.type)}>
              {'> '}
              {msg.text}
            </Text>
          ))}
        </Box>
      </Box>
    );
  }

  // Default sidebar view
  const visibleLog = log.slice(-SIDEBAR_LOG_LENGTH);

  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold>Log</Text>
      {visibleLog.map((msg) => (
        <Text key={msg.id} color={getMessageColor(msg.type)} wrap="truncate">
          {msg.text}
        </Text>
      ))}
    </Box>
  );
};

export default MessageLogView;