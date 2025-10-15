import React from 'react';
import { Box, Text } from 'ink';
import type { Actor } from '../engine/state.js';
import { useTheme } from '../themes.js';

interface SkillsViewProps {
  player: Actor;
}

const SkillsView: React.FC<SkillsViewProps> = ({ player }) => {
  const theme = useTheme();

  return (
    <Box flexDirection="column" borderStyle="single" padding={1} borderColor={theme.border}>
      <Text bold color={theme.accent}>Skills</Text>
      <Text color={theme.primary}>Skill Points: {player.skillPoints ?? 0}</Text>
      <Box marginTop={1}>
        <Text color={theme.accent}>[ (k) to open Skill Tree ]</Text>
      </Box>
    </Box>
  );
};

export default SkillsView;