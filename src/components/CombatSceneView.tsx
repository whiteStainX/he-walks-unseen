import { Box, Text } from 'ink';
import type { GameState } from '../engine/state.js';
import { useTheme } from '../themes.js';
import { getResource } from '../engine/resourceManager.js'; // Import getResource

interface CombatSceneViewProps {
  state: GameState;
}

export function CombatSceneView({ state }: CombatSceneViewProps) {
  const theme = useTheme();

  const player = state.actors.find((a) => a.isPlayer);
  const targetEnemy = state.actors.find(
    (actor) => actor.id === state.combatTargetId
  );

  if (!player || !targetEnemy) {
    return null;
  }

  // Load ASCII art for player and enemy
  const playerArt = getResource<string>('player_combat');
  const enemyArt = getResource<string>(targetEnemy.profile ? `${targetEnemy.profile}_combat` : 'goblin_combat');

  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={theme.border} padding={1}>
      <Box flexDirection="row" justifyContent="space-between" flexGrow={1}>
        {/* Player Art and Stats */}
        <Box flexDirection="column" alignItems="center" flexGrow={1}>
          <Text bold color={theme.accent}>Player</Text>
          <Box height={1} />
          {playerArt.split('\n').filter(line => line.trim() !== '').map((line, i) => (
            <Text key={`player-art-${i}`}>{line}</Text>
          ))}
          <Box height={1} />
          <Text color={theme.primary}>HP: {player.hp.current}/{player.hp.max}</Text>
          <Text color={theme.primary}>ATK: {player.attack}</Text>
          <Text color={theme.primary}>DEF: {player.defense}</Text>
        </Box>

        {/* VS Text */}
        <Box justifyContent="center" alignItems="center" paddingX={2}>
          <Text bold color={theme.primary}>VS</Text>
        </Box>

        {/* Enemy Art and Stats */}
        <Box flexDirection="column" alignItems="center" flexGrow={1}>
          <Text bold color={theme.critical}>{targetEnemy.name}</Text>
          <Box height={1} />
          {enemyArt.split('\n').filter(line => line.trim() !== '').map((line, i) => (
            <Text key={`enemy-art-${i}`}>{line}</Text>
          ))}
          <Box height={1} />
          <Text color={theme.primary}>HP: {targetEnemy.hp.current}/{targetEnemy.hp.max}</Text>
          <Text color={theme.primary}>ATK: {targetEnemy.attack}</Text>
          <Text color={theme.primary}>DEF: {targetEnemy.defense}</Text>
        </Box>
      </Box>
    </Box>
  );
}