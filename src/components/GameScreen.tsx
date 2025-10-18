import React from 'react';
import { Box, Text, useInput } from 'ink';
import MapView, { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from './MapView.js';
import StatusEffectsView from './StatusEffectsView.js';
import EquipmentView from './EquipmentView.js';
import InventoryView from './InventoryView.js';
import SkillsView from './SkillsView.js';
import MessageLogView from './MessageLogView.js';
import SkillTreeView from './SkillTreeView.js';
import { CombatMenuView } from './CombatMenuView.js';
import { CombatSceneView } from './CombatSceneView.js';
import DialogueView from './DialogueView.js';
import type { GameState, Skill } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { resolveAction } from '../input/keybindings.js';
import { getMapDefinition } from '../engine/worldManager.js';
import { updateState } from '../game/updateState.js';
import TerminalBox from './TerminalBox.js';
import { useTheme } from '../themes.js';
import PlayerExpressionManager from './PlayerExpressionManager.js';
import { getResource } from '../engine/resourceManager.js';
import { buildSkillTreeLayout } from '../lib/skillTreeLayout.js';

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
  const [isSkillTreeOpen, setIsSkillTreeOpen] = React.useState(false);
  const [selectedSkillId, setSelectedSkillId] = React.useState<string | null>(null);

  const skillData = React.useMemo(() => {
    try {
      return getResource<Record<string, Skill>>('skills');
    } catch (error) {
      return {} as Record<string, Skill>;
    }
  }, []);

  const skillTreeCanvasWidth = React.useMemo(
    () => Math.max(20, VIEWPORT_WIDTH * 2 - 6),
    []
  );
  const skillTreeCanvasHeight = React.useMemo(
    () => Math.max(8, VIEWPORT_HEIGHT - 6),
    []
  );

  const skillTreeLayout = React.useMemo(
    () => buildSkillTreeLayout(skillData, skillTreeCanvasWidth, skillTreeCanvasHeight),
    [skillData, skillTreeCanvasHeight, skillTreeCanvasWidth]
  );

  const layoutMap = React.useMemo(() => {
    return new Map(skillTreeLayout.map((node) => [node.id, node]));
  }, [skillTreeLayout]);

  const nodesByDepth = React.useMemo(() => {
    const map = new Map<number, typeof skillTreeLayout>();
    for (const node of skillTreeLayout) {
      const list = map.get(node.depth) ?? [];
      list.push(node);
      map.set(node.depth, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.x - b.x);
    }
    return map;
  }, [skillTreeLayout]);

  const dependentsMap = React.useMemo(() => {
    const dependents = new Map<string, string[]>();
    for (const skill of Object.values(skillData)) {
      const prereqs = skill.prerequisites ?? [];
      for (const prereq of prereqs) {
        if (!dependents.has(prereq)) {
          dependents.set(prereq, []);
        }
        dependents.get(prereq)!.push(skill.id);
      }
    }
    return dependents;
  }, [skillData]);

  React.useEffect(() => {
    if (skillTreeLayout.length === 0) {
      return;
    }
    setSelectedSkillId((current) => {
      if (current && layoutMap.has(current)) {
        return current;
      }
      return skillTreeLayout[0]?.id ?? null;
    });
  }, [layoutMap, skillTreeLayout]);

  React.useEffect(() => {
    if (
      isSkillTreeOpen &&
      !(state.phase === 'PlayerTurn' || state.phase === 'Inventory')
    ) {
      setIsSkillTreeOpen(false);
    }
  }, [isSkillTreeOpen, state.phase]);

  useInput(
    (input, key) => {
      const normalizedInput = input?.toLowerCase?.();

      if (isSkillTreeOpen) {
        if (key.escape || normalizedInput === 'k') {
          setIsSkillTreeOpen(false);
          return;
        }

        if (key.return && selectedSkillId) {
          updateState(GameAction.LEARN_SKILL, selectedSkillId);
          return;
        }

        const currentNode = selectedSkillId ? layoutMap.get(selectedSkillId) : null;
        if (!currentNode) {
          if (skillTreeLayout[0]) {
            setSelectedSkillId(skillTreeLayout[0].id);
          }
          return;
        }

        const currentSkill = skillData[currentNode.id];
        if (!currentSkill) {
          return;
        }

        const chooseClosest = (candidateIds: string[], preferRight = false) => {
          let chosen: { id: string; distance: number } | null = null;
          for (const id of candidateIds) {
            const node = layoutMap.get(id);
            if (!node) continue;
            const distance = Math.abs(node.x - currentNode.x) + Math.abs(node.y - currentNode.y);
            if (
              !chosen ||
              distance < chosen.distance ||
              (distance === chosen.distance && preferRight && node.x > (layoutMap.get(chosen.id)?.x ?? 0))
            ) {
              chosen = { id, distance };
            }
          }
          if (chosen) {
            setSelectedSkillId(chosen.id);
          }
        };

        if (key.upArrow) {
          chooseClosest(currentSkill.prerequisites ?? []);
          return;
        }

        if (key.downArrow) {
          chooseClosest(dependentsMap.get(currentNode.id) ?? [], true);
          return;
        }

        if (key.leftArrow || key.rightArrow) {
          const nodesOnLevel = nodesByDepth.get(currentNode.depth) ?? [];
          const currentIndex = nodesOnLevel.findIndex((entry) => entry.id === currentNode.id);
          if (currentIndex >= 0) {
            const direction = key.rightArrow ? 1 : -1;
            let newIndex = currentIndex + direction;
            while (newIndex >= 0 && newIndex < nodesOnLevel.length) {
              const candidate = nodesOnLevel[newIndex];
              if (candidate) {
                setSelectedSkillId(candidate.id);
                break;
              }
              newIndex += direction;
            }
          }
          return;
        }

        return;
      }

      if (
        normalizedInput === 'k' &&
        (state.phase === 'PlayerTurn' || state.phase === 'Inventory') &&
        skillTreeLayout.length > 0
      ) {
        setIsSkillTreeOpen(true);
        setSelectedSkillId((current) => {
          if (current && layoutMap.has(current)) {
            return current;
          }
          return skillTreeLayout[0].id;
        });
        return;
      }

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
        isSkillTreeOpen ||
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

    if (isSkillTreeOpen) {
      return (
        <SkillTreeView
          skills={skillData}
          player={player ?? undefined}
          layout={skillTreeLayout}
          canvasWidth={skillTreeCanvasWidth}
          canvasHeight={skillTreeCanvasHeight}
          selectedSkillId={selectedSkillId}
          width={VIEWPORT_WIDTH * 2}
          height={VIEWPORT_HEIGHT + 3}
        />
      );
    }

    if (state.phase === 'CombatMenu') {
      return (
        <TerminalBox
          paddingX={1}
          borderStyle="round"
          borderColor={theme.accent}
          height={VIEWPORT_HEIGHT + 3}
          width={VIEWPORT_WIDTH * 2}
          flexDirection="column"
        >
          <CombatSceneView state={state} />
        </TerminalBox>
      );
    }

    return (
      <MapView
        state={state}
        isDimmed={
          state.phase === 'Inventory' ||
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
                {player && <SkillsView player={player} />}
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