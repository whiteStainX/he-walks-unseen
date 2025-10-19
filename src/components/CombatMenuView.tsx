import { Box, Text } from 'ink';
import type { GameState } from '../engine/state.js';
import { useTheme } from '../themes.js';
import { getAvailableCombatActions } from '../game/combat/combatMenuActions.js';

interface CombatMenuViewProps {
  state: GameState;
}

export function CombatMenuView({ state }: CombatMenuViewProps) {
  const theme = useTheme();

  const isCombatActive =
    state.phase === 'CombatMenu' ||
    (state.phase === 'EnemyTurn' && state.combatTargetId);

  if (!isCombatActive) {
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

  const isPlayerTurn = state.phase === 'CombatMenu';

  return (
    <Box flexDirection="column">
      <Text color={theme.primary}>Engaging: {targetEnemy.name}</Text>
      <Text color={theme.primary}>
        AP: {player.actionPoints.current}/{player.actionPoints.max}
      </Text>
      {!isPlayerTurn && (
        <Text color={theme.warning}>Enemy is taking actions...</Text>
      )}
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
          <Box key={action.id} flexDirection="column">
            <Text color={optionColor}>
              {isSelected ? '> ' : '  '}
              {action.name} ({action.apCost} AP)
            </Text>
            {isSelected && action.description && (
              <Text color={theme.primary}>    {action.description}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
