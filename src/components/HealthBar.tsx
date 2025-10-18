import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../themes.js';

interface HealthBarProps {
  current: number;
  max: number;
  width?: number;
}

const HealthBar: React.FC<HealthBarProps> = ({ current, max, width = 10 }) => {
  const theme = useTheme();
  const percent = max > 0 ? current / max : 0;
  const filledWidth = Math.round(percent * width);
  const emptyWidth = width - filledWidth;

  const filledColor = percent > 0.5 ? theme.primary : percent > 0.2 ? theme.warning : theme.critical;

  return (
    <Box>
      <Text color={filledColor}>{'█'.repeat(filledWidth)}</Text>
      <Text color={theme.dim}>{'-'.repeat(emptyWidth)}</Text>
    </Box>
  );
};

export default HealthBar;
