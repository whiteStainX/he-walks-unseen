import React from 'react';
import { Box, Text, useInput } from 'ink';
import MapView, { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from './MapView.js';
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
import TerminalBox from './TerminalBox.js';
import { useTheme } from '../themes.js';
import PlayerExpressionManager from './PlayerExpressionManager.js';

interface Props {
  gameState: GameState;
}

export function isActionDefined(
  action: GameAction | undefined
): action is GameAction {
  return action !== undefined;
}

const GameScreen: React.FC<Props> = ({ gameState: state }) => {
  const theme = useTheme();

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
        borderColor={theme.accent}
        borderStyle="round"
      >
        <Text bold color={theme.accent}>
          You have escaped the dungeon!
        </Text>
        <Text color={theme.primary}>You are victorious.</Text>
      </Box>
    );
  }

  if (state.phase === 'Loss') {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        padding={2}
        borderColor={theme.critical}
        borderStyle="round"
      >
        <Text bold color={theme.critical}>
          You have been defeated.
        </Text>
        <Text color={theme.primary}>Game Over.</Text>
        <Box marginTop={1}>
          <Text color={theme.primary}>Press 'r' to restart.</Text>
        </Box>
      </Box>
    );
  }

  const mapDefinition = getMapDefinition(state.currentMapId);
  const mapName = mapDefinition?.id ?? 'Unknown Area';

  const visibleEnemies = state.actors.filter(
    (a) => !a.isPlayer && state.visibleTiles.has(`${a.position.x},${a.position.y}`)
  );
  const primaryEnemy = visibleEnemies.length > 0 ? visibleEnemies[0] : null;
  const renderMainPanel = () => {
    if (state.phase === 'Dialogue') {
      return (
        <TerminalBox
          paddingX={1}
          borderStyle="round"
          borderColor={theme.accent}
          height={VIEWPORT_HEIGHT + 3}
          width={VIEWPORT_WIDTH * 2}
          flexDirection="column"
        >
          <DialogueView state={state} />
        </TerminalBox>
      );
    }

    if (state.phase === 'MessageLog') {
      return (
        <MessageLogView
          log={state.log}
          logOffset={state.logOffset}
          phase={state.phase}
          height={VIEWPORT_HEIGHT + 3}
          width={VIEWPORT_WIDTH * 2}
        />
      );
    }

    return (
      <MapView
        state={state}
        isDimmed={
          state.phase === 'Inventory' ||
          state.phase === 'CombatMenu' ||
          state.phase === 'IdentifyMenu'
        }
      />
    );
  };

  return (
    <Box>
      {/* Main UI */}
      <Box flexDirection="column">
        <Box flexDirection="row">
          {/* Main Viewport Panel */}
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.border}
            paddingX={1}
          >
            <Box justifyContent="center">
              <Text bold color={theme.accent}>
                {mapName}
              </Text>
            </Box>
            {renderMainPanel()}
          </Box>

          {/* Sidebar Panel */}
          <Box
            flexDirection="column"
            marginLeft={2}
            paddingX={1}
            borderStyle="round"
            borderColor={theme.border}
            width={40}
          >
            {state.phase === 'CombatMenu' ? (
              <CombatMenuView state={state} />
            ) : (
              <>
                {player && (
                  <StatusEffectsView
                    statusEffects={player.statusEffects ?? []}
                  />
                )}
                {player && <EquipmentView player={player} />}
                <InventoryView
                  inventory={player?.inventory ?? []}
                  selectedItemIndex={state.selectedItemIndex}
                  phase={state.phase}
                />
                <SkillsView skills={player?.skills ?? []} />
              </>
            )}
          </Box>
        </Box>

        {/* Status Panel */}
        <Box marginTop={1} height={10} flexDirection="row">
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.border}
            paddingX={1}
            flexGrow={1}
          >
            <Box flexDirection="column">
              <Text bold color={theme.accent}>
                Status
              </Text>
              {player ? (
                <Box>
                  <Text color={theme.primary}>
                    HP: {player.hp.current}/{player.hp.max} | {' '}
                  </Text>
                  <Text color={theme.primary}>Level: {player.level ?? 1} | </Text>
                  <Text color={theme.primary}>
                    XP: {player.xp ?? 0}/{player.xpToNextLevel ?? 100}
                  </Text>
                </Box>
              ) : (
                <Text>N/A</Text>
              )}
              {primaryEnemy && (
                <Box marginTop={1}>
                  <Text color={theme.primary}>
                    Target: {primaryEnemy.name} ({primaryEnemy.char}) | HP: {
                      primaryEnemy.hp.current
                    }/
                    {primaryEnemy.hp.max}
                  </Text>
                </Box>
              )}
            </Box>
            <MessageLogView
              log={state.log}
              logOffset={state.logOffset}
              phase={state.phase}
            />
          </Box>
          <Box marginLeft={2}>
            <PlayerExpressionManager gameState={state} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default GameScreen;