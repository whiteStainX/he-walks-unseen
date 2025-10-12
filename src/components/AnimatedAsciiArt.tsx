import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../themes.js';

interface Props {
  art: string;
}

const NOISE_CHARS = ['~', '.', '*', '░', '▒'];
const GLITCH_PROBABILITY = 0.05; // 5% chance to replace a character

const distortArt = (originalArt: string): string => {
  return originalArt
    .split('\n')
    .map((line) => {
      let distortedLine = '';
      for (const char of line) {
        if (char !== ' ' && Math.random() < GLITCH_PROBABILITY) {
          distortedLine += NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)];
        } else {
          distortedLine += char;
        }
      }
      // Randomly shift some lines
      if (Math.random() < 0.1) {
        return ` ${distortedLine}`;
      }
      return distortedLine;
    })
    .join('\n');
};

const AnimatedAsciiArt: React.FC<Props> = ({ art }) => {
  const theme = useTheme();
  const [distortedArt, setDistortedArt] = useState(art);

  useEffect(() => {
    const timer = setInterval(() => {
      setDistortedArt(distortArt(art));
    }, 150);
    return () => clearInterval(timer);
  }, [art]);

  return (
    <Box flexDirection="column" alignItems="center">
      {distortedArt.split('\n').map((line, index) => (
        <Text key={index} color={theme.accent}>
          {line}
        </Text>
      ))}
    </Box>
  );
};

export default AnimatedAsciiArt;
