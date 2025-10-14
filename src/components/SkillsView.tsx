import React from 'react';
import { Box, Text } from 'ink';
import type { Actor } from '../engine/state.js';
import { useTheme } from '../themes.js';

interface SkillsViewProps {
  player: Actor;
}

const SkillsView: React.FC<SkillsViewProps> = ({ player }) => {
  const theme = useTheme();

  const learnedSkills = player.learnedSkills ? Object.keys(player.learnedSkills) : [];

  return (
    <Box flexDirection="column" borderStyle="single" padding={1} borderColor={theme.border}>
      <Text bold color={theme.accent}>Skills</Text>
      <Text color={theme.primary}>Skill Points: {player.skillPoints ?? 0}</Text>
      {learnedSkills.length === 0 ? (
        <Text color={theme.primary}>No skills learned.</Text>
      ) : (
        learnedSkills.map((skillId) => (
          <Text key={skillId} color={theme.primary}>- {skillId}</Text>
        ))
      )}
      {/* Placeholder for a 'Learn Skills' button/menu */}
      <Box marginTop={1}>
        <Text color={theme.accent}>[ Press 'k' to view the skill tree ]</Text>
      </Box>
    </Box>
  );
};

export default SkillsView;
