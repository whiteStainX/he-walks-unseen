import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { gameTitle } from './AsciiArt.js';
import { GameAction } from '../input/actions.js';
import { updateState } from '../game/updateState.js';

const WelcomeScreen = () => {
  const [selectedOption, setSelectedOption] = useState(0);
  const options = ['Start New Game', 'Load Game'];

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedOption((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    }
    if (key.downArrow) {
      setSelectedOption((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    }
    if (key.return) {
      if (selectedOption === 0) {
        updateState(GameAction.NEW_GAME);
      } else if (selectedOption === 1) {
        updateState(GameAction.LOAD_GAME);
      }
    }
  });

  return (
    <Box flexDirection="column" alignItems="center" padding={2}>
      {gameTitle.split('\n').map((line, index) => (
        <Text key={index} color="cyan">{line}</Text>
      ))}
      <Box flexDirection="column" alignItems="center" marginTop={2}>
        {options.map((option, index) => (
          <Text key={option} color={selectedOption === index ? 'yellow' : 'white'}>
            {selectedOption === index ? '> ' : '  '}
            {option}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

export default WelcomeScreen;
