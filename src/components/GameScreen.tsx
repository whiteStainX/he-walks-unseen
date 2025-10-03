import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import MapView from './MapView.js';
import type { GameState } from '../engine/state.js';
import type { GameAction } from '../input/actions.js';
import { resolveAction } from '../input/keybindings.js';
import { applyActionToState } from '../game/updateState.js';

interface Props {
  initialState: GameState;
  statusMessage: string;
}

export function isActionDefined(
  action: GameAction | undefined
): action is GameAction {
  return action !== undefined;
}

const GameScreen: React.FC<Props> = ({ initialState, statusMessage }) => {
  const [state, setState] = useState<GameState>(initialState);

  useInput((input, key) => {
    const action = resolveAction(input, key);

    if (!isActionDefined(action)) {
      return;
    }

    setState((currentState) => applyActionToState(currentState, action));
  });

  return (
    <Box flexDirection="column">
      <Box justifyContent="center" marginBottom={1}>
        <Text>{statusMessage}</Text>
      </Box>
      <MapView state={state} />
    </Box>
  );
};

export default GameScreen;
