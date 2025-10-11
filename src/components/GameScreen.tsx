import React from 'react';
import { Box, Text, useInput } from 'ink';
import MapView from './MapView.js';
import StatusEffectsView from './StatusEffectsView.js';
import EquipmentView from './EquipmentView.js';
import InventoryView from './InventoryView.js';
import SkillsView from './SkillsView.js';
import MessageLogView from './MessageLogView.js';
import { CombatMenuView } from './CombatMenuView.js';
import DialogueView from './DialogueView.js';
import type { GameState } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { resolveAction } from '../input/keybindings.js';
import { getMapDefinition } from '../engine/worldManager.js';
import { updateState } from '../game/updateState.js';

interface Props {
  gameState: GameState;
}

export function isActionDefined(
  action: GameAction | undefined
): action is GameAction {
  return action !== undefined;
}

const GameScreen: React.FC<Props> = ({ gameState: state }) => {
  useInput(
    (input, key) => {
      if (
        state.phase === 'PlayerTurn' ||
        state.phase === 'Inventory' ||
        state.phase === 'Targeting' ||
        state.phase === 'CombatMenu' ||
        state.phase === 'IdentifyMenu' ||
        state.phase === 'MessageLog' ||
        state.phase === 'Dialogue'
      ) {
        const action = resolveAction(input, key, state.phase);
        if (isActionDefined(action)) {
          updateState(action);
        }
      } else if (state.phase === 'Loss' && input.toLowerCase() === 'r') {
        updateState(GameAction.NEW_GAME);
      }
    },
    {
      isActive:
        state.phase === 'PlayerTurn' ||
        state.phase === 'Inventory' ||
        state.phase === 'Targeting' ||
        state.phase === 'CombatMenu' ||
        state.phase === 'IdentifyMenu' ||
        state.phase === 'MessageLog' ||
        state.phase === 'Dialogue' ||
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

  const mapDefinition = getMapDefinition(state.currentMapId);
  const mapName = mapDefinition?.id ?? 'Unknown Area';

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          paddingX={1}
        >
          <Box justifyContent="center">
            <Text bold>{mapName}</Text>
          </Box>
          <MapView
            state={state}
            isDimmed={
              state.phase === 'Inventory' ||
              state.phase === 'CombatMenu' ||
              state.phase === 'IdentifyMenu' ||
              state.phase === 'MessageLog' ||
              state.phase === 'Dialogue'
            }
          />
        </Box>
        <CombatMenuView state={state} />
        <DialogueView state={state} />
        {state.phase === 'MessageLog' && (
          <MessageLogView
            log={state.log}
            logOffset={state.logOffset}
            phase={state.phase}
            height={state.map.height}
          />
        )}
        <Box
          flexDirection="column"
          marginLeft={2}
          paddingX={1}
          borderStyle="round"
          width={40}
        >
          {player && <StatusEffectsView statusEffects={player.statusEffects ?? []} />}
          {player && <EquipmentView player={player} />}
          <InventoryView
            inventory={player?.inventory ?? []}
            selectedItemIndex={state.selectedItemIndex}
            phase={state.phase}
          />
          <SkillsView skills={player?.skills ?? []} />
        </Box>
      </Box>
      <Box flexDirection="column" marginTop={1} borderStyle="round" paddingX={1}>
        <Box flexDirection="column">
          <Text bold>Status</Text>
          {player ? (
            <Box>
              <Text>HP: {player.hp.current}/{player.hp.max} | </Text>
              <Text>Level: {player.level ?? 1} | </Text>
              <Text>XP: {player.xp ?? 0}/{player.xpToNextLevel ?? 100}</Text>
            </Box>
          ) : (
            <Text>N/A</Text>
          )}
        </Box>
        <MessageLogView
          log={state.log}
          logOffset={state.logOffset}
          phase={state.phase}
        />
      </Box>
    </Box>
  );
};

export default GameScreen;
