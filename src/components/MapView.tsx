import React from 'react';
import { Box, Text } from 'ink';
import type { GameState, MessageType } from '../engine/state.js';

interface Props {
  state: GameState;
  isDimmed?: boolean;
}

// Helper to determine the color for a message based on its type
const getMessageColor = (messageType: MessageType) => {
  switch (messageType) {
    case 'damage':
    case 'death':
      return 'red';
    case 'heal':
      return 'green';
    case 'win':
      return 'yellow'; // A bright color for a major event
    default:
      return 'white'; // For 'info'
  }
};

interface DisplayTile {
  char: string;
  color: string;
  backgroundColor?: string;
}

const MapView: React.FC<Props> = ({ state, isDimmed }) => {
  const { actors, items, entities, map, message, messageType } = state;
  const player = actors.find((a) => a.isPlayer);

  // Create a grid of display objects, starting with the base map tiles
  const displayGrid: DisplayTile[][] = map.tiles.map((row) =>
    row.map((tile) => ({
      char: tile.char,
      color: tile.walkable ? 'grey' : 'white', // Dim floors, bright walls
    }))
  );

  // Overlay items on the map
  for (const item of items) {
    if (
      item.position.y >= 0 &&
      item.position.y < map.height &&
      item.position.x >= 0 &&
      item.position.x < map.width
    ) {
      displayGrid[item.position.y][item.position.x] = {
        ...displayGrid[item.position.y][item.position.x],
        char: item.char,
        color: item.color || 'white',
      };
    }
  }

  // Overlay entities on the map
  for (const entity of entities) {
    if (
      entity.position.y >= 0 &&
      entity.position.y < map.height &&
      entity.position.x >= 0 &&
      entity.position.x < map.width
    ) {
      displayGrid[entity.position.y][entity.position.x] = {
        ...displayGrid[entity.position.y][entity.position.x],
        char: entity.char,
        color: entity.color || 'white',
      };
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
      displayGrid[actor.position.y][actor.position.x] = {
        ...displayGrid[actor.position.y][actor.position.x],
        char: actor.char,
        color: actor.color || 'white',
      };
    }
  }

  // Highlight the player's position
  if (player) {
    displayGrid[player.position.y][player.position.x].backgroundColor =
      'yellow';
    // Make the player character black for better contrast on a yellow background
    displayGrid[player.position.y][player.position.x].color = 'black';
  }

  const enemies = actors.filter((a) => !a.isPlayer);

  return (
    <Box flexDirection="column" paddingX={2}>
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        <Text bold dimColor={isDimmed}>
          He Walks Unseen
        </Text>
        {player && (
          <Text dimColor={isDimmed}>
            HP:{' '}
            <Text
              color={player.hp.current < player.hp.max * 0.3 ? 'red' : 'green'}
            >
              {player.hp.current}
            </Text>
            /{player.hp.max}
          </Text>
        )}
      </Box>

      <Box flexDirection="row" justifyContent="center">
        {/* Map View */}
        <Box flexDirection="column" alignItems="flex-start">
          {displayGrid.map((row, y) => (
            <Box key={y} flexDirection="row">
              {row.map((tile, x) => (
                <Text
                  key={`${x},${y}`}
                  color={tile.color}
                  backgroundColor={tile.backgroundColor}
                  dimColor={isDimmed}
                >
                  {tile.char}{' '}
                </Text>
              ))}
            </Box>
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
            <Text bold dimColor={isDimmed}>
              Enemies
            </Text>
            {enemies.map((enemy) => (
              <Text key={enemy.id} dimColor={isDimmed}>
                <Text color={enemy.color || 'white'}>
                  {enemy.name} ({enemy.char})
                </Text>
                : {enemy.hp.current}/{enemy.hp.max} HP
              </Text>
            ))}
          </Box>
        )}
      </Box>

      <Box marginTop={1} paddingX={2} borderStyle="round">
        <Text color={getMessageColor(messageType)} dimColor={isDimmed}>
          {message}
        </Text>
      </Box>
    </Box>
  );
};

export default MapView;