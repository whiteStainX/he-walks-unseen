import React from 'react';
import { Box, Text } from 'ink';
import type { StatusEffect } from '../engine/state.js';

interface Props {
  statusEffects: StatusEffect[];
}

const StatusEffectsView: React.FC<Props> = ({ statusEffects }) => {
  if (!statusEffects || statusEffects.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold>Active Effects</Text>
      {statusEffects.map((effect) => (
        <Text key={effect.id} color="yellow">
          - {effect.type.charAt(0).toUpperCase() + effect.type.slice(1)} ({effect.duration} turns)
        </Text>
      ))}
    </Box>
  );
};

export default StatusEffectsView;