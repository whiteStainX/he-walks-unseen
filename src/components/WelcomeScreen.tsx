import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { gameTitle } from './AsciiArt.js';
import { GameAction } from '../input/actions.js';
import { updateState } from '../game/updateState.js';
import type { ThemeName } from '../themes.js';
import AnimatedChoice from './AnimatedChoice.js';
import AnimatedAsciiArt from './AnimatedAsciiArt.js';

const WelcomeScreen = () => {
  const [selectedPill, setSelectedPill] = useState(0);

  const options: { label: string; theme: ThemeName; color: string; description: string }[] = [
    {
      label: 'Amber Pill',
      theme: 'amber',
      color: '#FFB000',
      description: 'You will wake up in your bed, and cry.',
    },
    {
      label: 'Green Pill',
      theme: 'green',
      color: '#00FF41',
      description: 'You will stay in the rabbit hole, and I show you the wonderland.',
    },
  ];

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedPill((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    }
    if (key.downArrow) {
      setSelectedPill((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    }
    if (key.return) {
      const chosenTheme = options[selectedPill].theme;
      updateState(GameAction.CHOOSE_THEME_AND_START, chosenTheme);
    }
  });

  const selectedDescription = options[selectedPill].description;

  return (
    <Box flexDirection="column" alignItems="center" padding={2}>
      <AnimatedAsciiArt art={gameTitle} />
      <Box flexDirection="column" alignItems="center" marginTop={2}>
        <Text>The time has come to choose.</Text>
        <Box flexDirection="column" alignItems="center" marginTop={1}>
          <AnimatedChoice
            label={options[0].label}
            color={options[0].color}
            isSelected={selectedPill === 0}
          />
          <AnimatedChoice
            label={options[1].label}
            color={options[1].color}
            isSelected={selectedPill === 1}
          />
        </Box>
        <Box marginTop={1} width="100%" alignItems="center">
          <Text>{selectedDescription}</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default WelcomeScreen;