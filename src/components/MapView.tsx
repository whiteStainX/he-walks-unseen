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
  isDim: boolean;
}

const createDisplayGrid = (state: GameState): (DisplayTile | null)[][] => {
  const { actors, items, entities, map, visibleTiles, exploredTiles } = state;

  const displayGrid: (DisplayTile | null)[][] = map.tiles.map((row, y) =>
    row.map((tile, x) => {
      const coord = `${x},${y}`;
      const isVisible = visibleTiles.has(coord);
      const isExplored = exploredTiles.has(coord);

      if (!isVisible && !isExplored) {
        return null; // Unexplored tile
      }

      return {
        char: tile.char,
        color: tile.walkable ? 'grey' : 'white',
        isDim: !isVisible,
      };
    })
  );

  const allEntities: (Entity | Actor | Item)[] = [...items, ...entities, ...actors];

  for (const entity of allEntities) {
    const { x, y } = entity.position;
    const coord = `${x},${y}`;

    if (
      visibleTiles.has(coord) &&
      y >= 0 &&
      y < map.height &&
      x >= 0 &&
      x < map.width &&
      displayGrid[y][x] // Make sure we don't try to update a null tile (shouldn't happen)
    ) {
      displayGrid[y][x]!.char = entity.char;
      displayGrid[y][x]!.color = entity.color || 'white';
      displayGrid[y][x]!.isDim = false; // Entities are only drawn if visible
    }
  }

  const player = actors.find((a) => a.isPlayer);
  if (player) {
    const { x, y } = player.position;
    if (displayGrid[y]?.[x]) {
      displayGrid[y][x]!.backgroundColor = 'yellow';
      displayGrid[y][x]!.color = 'black';
      displayGrid[y][x]!.isDim = false;
    }
  }

  return displayGrid;
};

const MapView: React.FC<Props> = ({ state, isDimmed }) => {
  const { actors, message, messageType, visibleTiles } = state;
  const player = actors.find((a) => a.isPlayer);
  const displayGrid = createDisplayGrid(state);
  const visibleEnemies = actors.filter(
    (a) => !a.isPlayer && visibleTiles.has(`${a.position.x},${a.position.y}`)
  );

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
              {row.map((tile, x) => {
                if (tile === null) {
                  return <Text key={`${x},${y}`}>  </Text>; // Render empty space for unexplored tiles
                }
                return (
                  <Text
                    key={`${x},${y}`}
                    color={tile.color}
                    backgroundColor={tile.backgroundColor}
                    dimColor={isDimmed || tile.isDim}
                  >
                    {tile.char}{' '}
                  </Text>
                );
              })}
            </Box>
          ))}
        </Box>

        {/* Side Panel for Enemy Status */}
        {visibleEnemies.length > 0 && (
          <Box
            flexDirection="column"
            marginLeft={4}
            paddingX={2}
            borderStyle="round"
            borderColor="gray"
          >
            <Text bold dimColor={isDimmed}>
              Visible Enemies
            </Text>
            {visibleEnemies.map((enemy) => (
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
