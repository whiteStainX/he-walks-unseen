import { Box, Text } from 'ink';
import type { GameState } from '../engine/state.js';
import { useTheme } from '../themes.js';
import { getAvailableCombatActions } from '../game/combat/combatMenuActions.js';

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
    return null;
  }

  const availableActions = getAvailableCombatActions(player);

  return (
    <Box flexDirection="column">
      <Text color={theme.primary}>Engaging: {targetEnemy.name}</Text>
      <Text color={theme.primary}>
        AP: {player.actionPoints.current}/{player.actionPoints.max}
      </Text>
      <Box height={1} />
      {availableActions.map((action, index) => {
        if (typeof action.apCost !== 'number') return null;
        const isSelected = index === state.selectedCombatMenuIndex;
        const canAfford = player.actionPoints!.current >= action.apCost;
        const optionColor = isSelected
          ? theme.accent
          : canAfford
          ? theme.primary
          : theme.dim;

        return (
          <Text key={action.id} color={optionColor}>
            {isSelected ? '> ' : '  '}
            {action.name} ({action.apCost} AP)
          </Text>
        );
      })}
    </Box>
  );
}
