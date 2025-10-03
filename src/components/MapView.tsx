import React from 'react';
import { Box, Text } from 'ink';
import type { GameState } from '../engine/state.js';

interface Props {
  state: GameState;
}

const MapView: React.FC<Props> = ({ state }) => {
  const { actors, items, map, message } = state;
  const player = actors.find((a) => a.isPlayer);

  // Start with the base map tiles
  const displayTiles = map.tiles.map((row) => row.map((tile) => tile.char));

  // Overlay items on the map first
  for (const item of items) {
    if (
      item.position.y >= 0 &&
      item.position.y < map.height &&
      item.position.x >= 0 &&
      item.position.x < map.width
    ) {
      displayTiles[item.position.y][item.position.x] = item.char;
    }
  }

  // Overlay actors on top of items and tiles
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

  const enemies = actors.filter((a) => !a.isPlayer);

  return (
    <Box flexDirection="column" paddingX={2}>
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        <Text bold>He Walks Unseen</Text>
        {player && <Text>HP: {player.hp.current}/{player.hp.max}</Text>}
      </Box>

      <Box flexDirection="row" justifyContent="center">
        {/* Map View */}
        <Box flexDirection="column" alignItems="center">
          {displayTiles.map((row, y) => (
            <Text key={y}>{row.join(' ')}</Text>
          ))}
        </Box>

        {/* Side Panel for Enemy Status */}
        {enemies.length > 0 && (
          <Box
            flexDirection="column"
            marginLeft={4}
            paddingX={2}
            borderStyle="round"
            borderColor="gray"
          >
            <Text bold>Enemies</Text>
            {enemies.map((enemy) => (
              <Text key={enemy.id}>
                {enemy.name} ({enemy.char}): {enemy.hp.current}/{enemy.hp.max} HP
              </Text>
            ))}
          </Box>
        )}
      </Box>

      <Box marginTop={1} paddingX={2} borderStyle="round">
        <Text>{message}</Text>
      </Box>
    </Box>
  );
};

export default MapView;
