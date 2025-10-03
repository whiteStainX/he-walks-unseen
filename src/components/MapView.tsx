import React from 'react';
import { Box, Text } from 'ink';
import type { GameState } from '../engine/state.js';

interface Props {
  state: GameState;
}

const MapView: React.FC<Props> = ({ state }) => {
  const { actors, map, message } = state;
  const player = actors.find((a) => a.isPlayer);

  // Start with the base map tiles
  const displayTiles = map.tiles.map((row) => row.map((tile) => tile.char));

  // Overlay actors on the map
  for (const actor of actors) {
    if (
      actor.position.y >= 0 &&
      actor.position.y < map.height &&
      actor.position.x >= 0 &&
      actor.position.x < map.width
    ) {
      displayTiles[actor.position.y][actor.position.x] = actor.char;
    }
  }

  return (
    <Box flexDirection="column" paddingX={2}>
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        <Text bold>He Walks Unseen</Text>
        {player && <Text>HP: {player.hp.current}/{player.hp.max}</Text>}
      </Box>

      <Box flexDirection="column" alignItems="center">
        {displayTiles.map((row, y) => (
          <Text key={y}>{row.join(' ')}</Text>
        ))}
      </Box>

      <Box marginTop={1} paddingX={2} borderStyle="round">
        <Text>{message}</Text>
      </Box>
    </Box>
  );
};

export default MapView;
