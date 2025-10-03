import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import MapView from './MapView.js';
import type { GameState } from '../engine/state.js';
import type { GameAction } from '../input/actions.js';
import { resolveAction } from '../input/keybindings.js';
import {
  applyActionToState,
  processEnemyTurns,
} from '../game/updateState.js';
import { createInitialGameState } from '../game/initialState.js';

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

  // This effect handles the enemy turn logic whenever the game phase changes.
  useEffect(() => {
    if (state.phase === 'EnemyTurn') {
      const timer = setTimeout(() => {
        setState((currentState) => processEnemyTurns(currentState));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state]);

  // Handles player input during their turn.
  useInput(
    (input, key) => {
      if (state.phase !== 'PlayerTurn') return;
      const action = resolveAction(input, key);
      if (isActionDefined(action)) {
        setState((currentState) => applyActionToState(currentState, action));
      }
    },
    { isActive: state.phase === 'PlayerTurn' }
  );

  // Handles input for restarting the game on the loss screen.
  useInput(
    (input) => {
      if (input.toLowerCase() === 'r') {
        setState(createInitialGameState('A new adventure begins...'));
      }
    },
    { isActive: state.phase === 'Loss' }
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
        <Box marginTop={1}>
          <Text>Press 'r' to restart.</Text>
        </Box>
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
