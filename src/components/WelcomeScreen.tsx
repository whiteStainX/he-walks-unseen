import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { gameTitle } from './AsciiArt.js';
import { GameAction } from '../input/actions.js';
import { updateState } from '../game/updateState.js';
import type { ThemeName } from '../themes.js';
import Pill from './Pill.js';

const WelcomeScreen = () => {
  const [selectedPill, setSelectedPill] = useState(0);

  const options: { label: string; theme: ThemeName; color: string; description: string }[] = [
    {
      label: 'Amber Pill',
      theme: 'amber',
      color: '#FFB000',
      description: 'A warm, steady glow. The world you know, but clearer. The path of certainty.',
    },
    {
      label: 'Green Pill',
      theme: 'green',
      color: '#00FF41',
      description: 'An electric hum. A reality rewritten in flickering code. The path of the unknown.',
    },
  ];

  useInput((input, key) => {
    if (key.leftArrow) {
      setSelectedPill(0);
    }
    if (key.rightArrow) {
      setSelectedPill(1);
    }
    if (key.return) {
      const chosenTheme = options[selectedPill].theme;
      updateState(GameAction.CHOOSE_THEME_AND_START, chosenTheme);
    }
  });

  const selectedDescription = options[selectedPill].description;

  return (
    <Box flexDirection="column" alignItems="center" padding={2}>
      {gameTitle.split('\n').map((line, index) => (
        <Text key={index} color="cyan">{line}</Text>
      ))}
      <Box flexDirection="column" alignItems="center" marginTop={2}>
        <Text>The time has come to choose.</Text>
        <Box flexDirection="row" marginTop={1}>
          <Pill color={options[0].color} isSelected={selectedPill === 0} />
          <Pill color={options[1].color} isSelected={selectedPill === 1} />
        </Box>
        <Box marginTop={1} width="100%" alignItems="center">
          <Text>{selectedDescription}</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default WelcomeScreen;
