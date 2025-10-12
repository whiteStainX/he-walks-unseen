import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { gameTitle } from './AsciiArt.js';
import { GameAction } from '../input/actions.js';
import { updateState } from '../game/updateState.js';
import type { ThemeName } from '../themes.js';

const WelcomeScreen = () => {
  const [selectedOption, setSelectedOption] = useState(0);
  const options: { label: string; theme: ThemeName; color: string }[] = [
    { label: 'Amber Pill', theme: 'amber', color: '#FFB000' },
    { label: 'Green Pill', theme: 'green', color: '#00FF41' },
  ];

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedOption((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    }
    if (key.downArrow) {
      setSelectedOption((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    }
    if (key.return) {
      const chosenTheme = options[selectedOption].theme;
      updateState(GameAction.CHOOSE_THEME_AND_START, chosenTheme);
    }
  });

  return (
    <Box flexDirection="column" alignItems="center" padding={2}>
      {gameTitle.split('\n').map((line, index) => (
        <Text key={index} color="cyan">{line}</Text>
      ))}
      <Box flexDirection="column" alignItems="center" marginTop={2}>
        <Text>The time has come to choose.</Text>
        <Text>Will you take the amber pill, or the green pill?</Text>
        <Box height={1} />
        {options.map((option, index) => (
          <Text key={option.label} color={selectedOption === index ? option.color : 'white'}>
            {selectedOption === index ? '> ' : '  '}[ {option.label} ]
          </Text>
        ))}
      </Box>
    </Box>
  );
};

export default WelcomeScreen;
