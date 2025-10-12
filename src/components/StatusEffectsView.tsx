import React from 'react';
import { Box, Text } from 'ink';
import type { StatusEffect } from '../engine/state.js';
import { useTheme } from '../themes.js';

interface Props {
  statusEffects: StatusEffect[];
}

const StatusEffectsView: React.FC<Props> = ({ statusEffects }) => {
  const theme = useTheme();

  if (!statusEffects || statusEffects.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold color={theme.accent}>Active Effects</Text>
      {statusEffects.map((effect) => (
        <Text key={effect.id} color={theme.primary}>
          - {effect.type.charAt(0).toUpperCase() + effect.type.slice(1)} ({effect.duration} turns)
        </Text>
      ))}
    </Box>
  );
};

export default StatusEffectsView;