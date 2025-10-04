import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import MapView from './MapView.js';
import InventoryView from './InventoryView.js';
import SkillsView from './SkillsView.js';
import type { GameState, MessageType } from '../engine/state.js';
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

const getMessageColor = (messageType: MessageType) => {
  switch (messageType) {
    case 'damage':
    case 'death':
      return 'red';
    case 'heal':
    case 'win':
      return 'green';
    case 'info':
    default:
      return 'white';
  }
};

const GameScreen: React.FC<Props> = ({ initialState }) => {
  const [state, setState] = useState<GameState>(initialState);

  useEffect(() => {
    if (state.phase === 'EnemyTurn') {
      const timer = setTimeout(() => {
        setState((currentState) => processEnemyTurns(currentState));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state]);

  useInput(
    (input, key) => {
      if (state.phase === 'PlayerTurn' || state.phase === 'Inventory' || state.phase === 'Targeting') {
        const action = resolveAction(input, key, state.phase);
        if (isActionDefined(action)) {
          setState((currentState) => applyActionToState(currentState, action));
        }
      } else if (state.phase === 'Loss' && input.toLowerCase() === 'r') {
        setState(createInitialGameState('A new adventure begins...'));
      }
    },
    {
      isActive:
        state.phase === 'PlayerTurn' ||
        state.phase === 'Inventory' ||
        state.phase === 'Targeting' ||
        state.phase === 'Loss',
    }
  );

  const player = state.actors.find((a) => a.isPlayer);

  if (state.phase === 'Win') {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        padding={2}
        borderColor="green"
        borderStyle="round"
      >
        <Text bold color="green">
          You have escaped the dungeon!
        </Text>
        <Text>You are victorious.</Text>
      </Box>
    );
  }

  if (state.phase === 'Loss') {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        padding={2}
        borderColor="red"
        borderStyle="round"
      >
        <Text bold color="red">
          You have been defeated.
        </Text>
        <Text>Game Over.</Text>
        <Box marginTop={1}>
          <Text>Press 'r' to restart.</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="row">
      <MapView state={state} isDimmed={state.phase === 'Inventory'} />
      <Box
        flexDirection="column"
        marginLeft={2}
        paddingX={1}
        borderStyle="round"
        width={40}
      >
        <Box flexDirection="column" paddingBottom={1}>
          <Text bold>Status</Text>
          {player ? (
            <>
              <Text>
                HP: {player.hp.current}/{player.hp.max}
              </Text>
              <Text>Level: {player.level ?? 1}</Text>
              <Text>
                XP: {player.xp ?? 0}/{player.xpToNextLevel ?? 100}
              </Text>
            </>
          ) : (
            <Text>N/A</Text>
          )}
        </Box>

        <InventoryView
          inventory={player?.inventory ?? []}
          selectedItemIndex={state.selectedItemIndex}
          phase={state.phase}
        />

        <SkillsView skills={player?.skills ?? []} />

        <Box flexDirection="column" paddingTop={1}>
          <Text bold>Log</Text>
          <Text color={getMessageColor(state.messageType)}>
            {state.message}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default GameScreen;
