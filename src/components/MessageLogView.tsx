import React from 'react';
import { Box, Text } from 'ink';
import type { GameState, Message, MessageType } from '../engine/state.js';
import TerminalBox from './TerminalBox.js';
import { useTheme, Theme } from '../themes.js';

const getMessageColor = (messageType: MessageType, theme: Theme) => {
  switch (messageType) {
    case 'damage':
    case 'death':
      return theme.critical;
    case 'heal':
    case 'win':
      return theme.accent;
    case 'info':
    default:
      return theme.primary;
  }
};

interface Props {
  log: Message[];
  logOffset: number;
  phase: GameState['phase'];
  height?: number;
  width?: number;
}

const SIDEBAR_LOG_LENGTH = 5;

const MessageLogView: React.FC<Props> = ({
  log,
  logOffset,
  phase,
  height = SIDEBAR_LOG_LENGTH,
  width,
}) => {
  const theme = useTheme();

  if (phase === 'MessageLog') {
    // Full-screen, scrollable view
    // Subtracting 4 for padding and title
    const visibleLog = log.slice(logOffset, logOffset + height - 4);

    return (
      <TerminalBox
        width={width}
        height={height}
        flexGrow={1}
        paddingX={1}
        borderStyle="round"
        borderColor={theme.border}
        flexDirection="column"
      >
        <Box paddingBottom={1}>
          <Text bold color={theme.accent}>Message Log (scroll with up/down, 'l' to close)</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          {visibleLog.map((msg) => (
            <Text key={msg.id} color={getMessageColor(msg.type, theme)}>
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
      <Text bold color={theme.accent}>Log</Text>
      {visibleLog.map((msg) => (
        <Text key={msg.id} color={getMessageColor(msg.type, theme)} wrap="truncate">
          {msg.text}
        </Text>
      ))}
    </Box>
  );
};

export default MessageLogView;