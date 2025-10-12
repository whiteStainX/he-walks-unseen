import { Box, Text } from 'ink';
import type { GameState } from '../engine/state.js';
import { useTheme } from '../themes.js';
import { BASIC_COMBAT_ACTIONS } from '../game/combatMenuActions.js';

interface CombatMenuViewProps {
  state: GameState;
}

export function CombatMenuView({ state }: CombatMenuViewProps) {
  const theme = useTheme();

  if (state.phase !== 'CombatMenu') {
    return null;
  }

  const player = state.actors.find((a) => a.isPlayer);
  const targetEnemy = state.actors.find(
    (actor) => actor.id === state.combatTargetId
  );

  if (!player || !targetEnemy || !player.actionPoints) {
    return null; // Should not happen in CombatMenu phase
  }

  const currentOptions = BASIC_COMBAT_ACTIONS; // For now, just basic actions

  return (
    <Box flexDirection="column">
      <Text color={theme.primary}>Engaging: {targetEnemy.name}</Text>
      <Text color={theme.primary}>AP: {player.actionPoints.current}/{player.actionPoints.max}</Text>
      <Box height={1} />
      {currentOptions.map((option, index) => {
        const isSelected = index === state.selectedCombatMenuIndex;
        const canAfford = player.actionPoints.current >= option.apCost;
        const optionColor = isSelected
          ? theme.accent
          : canAfford
          ? theme.primary
          : theme.dim;

        return (
          <Text key={option.id} color={optionColor}>
            {isSelected ? '> ' : '  '}
            {option.name} ({option.apCost} AP)
          </Text>
        );
      })}
    </Box>
  );
}