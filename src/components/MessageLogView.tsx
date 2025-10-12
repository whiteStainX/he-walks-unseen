import React from 'react';
import { Box, Text } from 'ink';
import type { GameState, Message, MessageType } from '../engine/state.js';
import TerminalBox from './TerminalBox.js';

const getMessageColor = (messageType: MessageType) => {
  switch (messageType) {
    case 'damage':
    case 'death':
      return 'red';
    case 'heal':
    case 'win':
      return 'cyan';
    case 'info':
    default:
      return 'yellow';
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
    // Full-screen, scrollable view
    // Subtracting 4 for padding and title
    const visibleLog = log.slice(logOffset, logOffset + height - 4);

    return (
      <TerminalBox
        width="100%"
        height={height}
        flexGrow={1}
        paddingX={1}
        borderColor="yellow"
      >
        <Box paddingBottom={1}>
          <Text bold>Message Log (scroll with up/down, 'l' to close)</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          {visibleLog.map((msg) => (
            <Text key={msg.id} color={getMessageColor(msg.type)}>
              {'> '}
              {msg.text}
            </Text>
          ))}
        </Box>
      </TerminalBox>
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