import React from 'react';
import { Box, Text } from 'ink';
import type { GameState, MessageType, Entity, Actor, Item } from '../engine/state.js';

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

const createDisplayGrid = (state: GameState): DisplayTile[][] => {
  const { actors, items, entities, map } = state;

  const displayGrid: DisplayTile[][] = map.tiles.map((row) =>
    row.map((tile) => ({
      char: tile.char,
      color: tile.walkable ? 'grey' : 'white',
    }))
  );

  const allEntities: (Entity | Actor | Item)[] = [...items, ...entities, ...actors];

  for (const entity of allEntities) {
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

  const player = actors.find((a) => a.isPlayer);
  if (player) {
    displayGrid[player.position.y][player.position.x].backgroundColor =
      'yellow';
    displayGrid[player.position.y][player.position.x].color = 'black';
  }

  return displayGrid;
};

const MapView: React.FC<Props> = ({ state, isDimmed }) => {
  const { actors, message, messageType } = state;
  const player = actors.find((a) => a.isPlayer);
  const displayGrid = createDisplayGrid(state);
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
