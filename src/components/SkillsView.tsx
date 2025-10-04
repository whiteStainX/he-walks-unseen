import React from 'react';
import { Box, Text } from 'ink';
import type { Skill } from '../engine/state.js';

interface SkillsViewProps {
  skills: Skill[];
}

const SkillsView: React.FC<SkillsViewProps> = ({ skills }) => {
  return (
    <Box flexDirection="column" borderStyle="single" padding={1}>
      <Text bold>Skills</Text>
      {skills.length === 0 ? (
        <Text>You have no skills.</Text>
      ) : (
        skills.map((skill) => (
          <Box key={skill.id} flexDirection="column">
            <Text bold>{skill.name}</Text>
            <Text>{skill.description}</Text>
          </Box>
        ))
      )}
    </Box>
  );
};

export default SkillsView;
