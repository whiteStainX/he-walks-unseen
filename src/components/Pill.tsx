import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface Props {
  color: string;
  isSelected: boolean;
}

const GLOW_CHARS = ['o', 'O', '0', 'O'];

const Pill: React.FC<Props> = ({ color, isSelected }) => {
  const [glowIndex, setGlowIndex] = useState(0);

  useEffect(() => {
    if (isSelected) {
      const timer = setInterval(() => {
        setGlowIndex((prev) => (prev + 1) % GLOW_CHARS.length);
      }, 150);
      return () => clearInterval(timer);
    }
  }, [isSelected]);

  const glowChar = isSelected ? GLOW_CHARS[glowIndex] : ' ';

  return (
    <Box flexDirection="column" alignItems="center" padding={1}>
      <Text color={isSelected ? color : 'grey'}>  /‾‾‾\</Text>
      <Text color={isSelected ? color : 'grey'}> ( {glowChar} )</Text>
      <Text color={isSelected ? color : 'grey'}>  \___/</Text>
    </Box>
  );
};

export default Pill;
