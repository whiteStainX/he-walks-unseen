import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import MapView from './MapView.js';
import type { GameState } from '../engine/state.js';
import type { GameAction } from '../input/actions.js';
import { resolveAction } from '../input/keybindings.js';
import { applyActionToState } from '../game/updateState.js';

interface Props {
  initialState: GameState;
}

export function isActionDefined(
  action: GameAction | undefined
): action is GameAction {
  return action !== undefined;
}

const GameScreen: React.FC<Props> = ({ initialState }) => {
  const [state, setState] = useState<GameState>(initialState);

  useInput(
    (input, key) => {
      const action = resolveAction(input, key);
      if (!isActionDefined(action)) {
        return;
      }
      setState((currentState) => applyActionToState(currentState, action));
    },
    // Only process input when the game is in the 'Playing' phase
    { isActive: state.phase === 'Playing' }
  );

  if (state.phase === 'Win') {
    return (
      <Box flexDirection="column" alignItems="center" padding={2} borderColor="green" borderStyle="round">
        <Text bold color="green">You have escaped the dungeon!</Text>
        <Text>You are victorious.</Text>
      </Box>
    );
  }

  if (state.phase === 'Loss') {
    return (
      <Box flexDirection="column" alignItems="center" padding={2} borderColor="red" borderStyle="round">
        <Text bold color="red">You have been defeated.</Text>
        <Text>Game Over.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <MapView state={state} />
    </Box>
  );
};

export default GameScreen;
