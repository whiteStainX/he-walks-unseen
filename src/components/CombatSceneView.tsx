import { Box, Text } from 'ink';
import type { GameState } from '../engine/state.js';
import { useTheme } from '../themes.js';
import { getResource, hasResource } from '../engine/resourceManager.js';
import HealthBar from './HealthBar.js';

interface CombatSceneViewProps {
  state: GameState;
}

const ART_BOX_HEIGHT = 8;

function getArt(id: string): string[] {
  try {
    if (hasResource(id)) {
      const art = getResource<string>(id);
      return art.split('\n').filter(line => line.trim() !== '');
    }
  } catch (e) {
    // Fallback if resource loading fails
  }
  return ['Art not found'];
}

function prepareArtForDisplay(artLines: string[]): string[] {
  if (artLines.length > ART_BOX_HEIGHT) {
    // Crop the art if it's too tall
    return artLines.slice(0, ART_BOX_HEIGHT);
  }
  if (artLines.length < ART_BOX_HEIGHT) {
    // Pad the art if it's too short
    const paddingNeeded = ART_BOX_HEIGHT - artLines.length;
    const topPadding = Math.floor(paddingNeeded / 2);
    const bottomPadding = Math.ceil(paddingNeeded / 2);
    return [
      ...Array(topPadding).fill(''),
      ...artLines,
      ...Array(bottomPadding).fill(''),
    ];
  }
  return artLines;
}

export function CombatSceneView({ state }: CombatSceneViewProps) {
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

  if (!player || !targetEnemy) {
    return null;
  }

  const playerArt = prepareArtForDisplay(getArt('player_combat'));
  const enemyArt = prepareArtForDisplay(
    getArt(targetEnemy.profile ? `${targetEnemy.profile}_combat` : 'goblin_combat')
  );

  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={theme.border} padding={1}>
      <Box flexDirection="row" justifyContent="space-between" flexGrow={1}>
        {/* Player Art and Stats */}
        <Box flexDirection="column" alignItems="center" flexGrow={1}>
          <Text bold color={theme.accent}>Player</Text>
          <Box height={ART_BOX_HEIGHT} flexDirection="column" justifyContent="center">
            {playerArt.map((line, i) => (
              <Text key={`player-art-${i}`}>{line}</Text>
            ))}
          </Box>
          <HealthBar current={player.hp.current} max={player.hp.max} />
          <Text color={theme.primary}>HP: {player.hp.current}/{player.hp.max}</Text>
          <Box marginTop={1}>
            {(player.statusEffects ?? []).map(effect => (
              <Text key={effect.id} color={theme.warning}>- {effect.type} ({effect.duration}) -</Text>
            ))}
          </Box>
        </Box>

        {/* VS Text */}
        <Box justifyContent="center" alignItems="center" paddingX={2}>
          <Text bold color={theme.primary}>VS</Text>
        </Box>

        {/* Enemy Art and Stats */}
        <Box flexDirection="column" alignItems="center" flexGrow={1}>
          <Text bold color={theme.critical}>{targetEnemy.name}</Text>
          <Box height={ART_BOX_HEIGHT} flexDirection="column" justifyContent="center">
            {enemyArt.map((line, i) => (
              <Text key={`enemy-art-${i}`}>{line}</Text>
            ))}
          </Box>
          <HealthBar current={targetEnemy.hp.current} max={targetEnemy.hp.max} />
          <Text color={theme.primary}>HP: {targetEnemy.hp.current}/{targetEnemy.hp.max}</Text>
          <Box marginTop={1}>
            {(targetEnemy.statusEffects ?? []).map(effect => (
              <Text key={effect.id} color={theme.warning}>- {effect.type} ({effect.duration}) -</Text>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}