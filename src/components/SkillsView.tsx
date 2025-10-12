import React from 'react';
import { Box, Text } from 'ink';
import type { Skill } from '../engine/state.js';
import { useTheme } from '../themes.js';

interface SkillsViewProps {
  skills: Skill[];
}

const SkillsView: React.FC<SkillsViewProps> = ({ skills }) => {
  const theme = useTheme();

  return (
    <Box flexDirection="column" borderStyle="single" padding={1} borderColor={theme.border}>
      <Text bold color={theme.accent}>Skills</Text>
      {skills.length === 0 ? (
        <Text color={theme.primary}>You have no skills.</Text>
      ) : (
        skills.map((skill) => (
          <Box key={skill.id} flexDirection="column">
            <Text bold color={theme.primary}>{skill.name}</Text>
            <Text color={theme.primary}>{skill.description}</Text>
          </Box>
        ))
      )}
    </Box>
  );
};

export default SkillsView;
