
import { Box, Text } from 'ink';
import type { GameState } from '../engine/state.js';
import { useTheme } from '../themes.js';

interface CombatMenuViewProps {
  state: GameState;
}

const COMBAT_OPTIONS = ['Attack', 'Cancel'];

export function CombatMenuView({ state }: CombatMenuViewProps) {
  const theme = useTheme();

  if (state.phase !== 'CombatMenu') {
    return null;
  }

  const targetEnemy = state.actors.find(
    (actor) => actor.id === state.combatTargetId
  );

  if (!targetEnemy) {
    return null; // Should not happen in CombatMenu phase
  }

  return (
    <Box flexDirection="column">
      <Text color={theme.primary}>Engaging: {targetEnemy.name}</Text>
      <Box height={1} />
      {COMBAT_OPTIONS.map((option, index) => {
        const isSelected = index === state.selectedCombatMenuIndex;
        return (
          <Text key={option} color={isSelected ? theme.accent : theme.primary}>
            {isSelected ? '> ' : '  '}
            {option}
          </Text>
        );
      })}
    </Box>
  );
}