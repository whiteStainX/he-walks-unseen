import React from 'react';
import { Box, Text } from 'ink';
import type { GameState, Entity, Actor, Item } from '../engine/state.js';
import { useTheme } from '../themes.js';

interface Props {
  state: GameState;
  isDimmed?: boolean;
}

interface DisplayTile {
  char: string;
  color: string;
  backgroundColor?: string;
  isDim: boolean;
}

export const VIEWPORT_WIDTH = 40;
export const VIEWPORT_HEIGHT = 20;

const createDisplayGrid = (
  state: GameState,
  theme: ReturnType<typeof useTheme>
): (DisplayTile | null)[][] => {
  const { actors, items, entities, map, visibleTiles, exploredTiles } = state;
  const player = actors.find((a) => a.isPlayer)!;

  // Calculate the ideal top-left corner to center the player
  let topLeftX = player.position.x - Math.floor(VIEWPORT_WIDTH / 2);
  let topLeftY = player.position.y - Math.floor(VIEWPORT_HEIGHT / 2);

  // If map is larger than viewport, clamp to map boundaries. Otherwise, topLeft is 0.
  topLeftX =
    map.width > VIEWPORT_WIDTH
      ? Math.max(0, Math.min(topLeftX, map.width - VIEWPORT_WIDTH))
      : 0;
  topLeftY =
    map.height > VIEWPORT_HEIGHT
      ? Math.max(0, Math.min(topLeftY, map.height - VIEWPORT_HEIGHT))
      : 0;

  // Calculate padding required to center a small map inside the viewport
  const padX =
    map.width < VIEWPORT_WIDTH ? Math.floor((VIEWPORT_WIDTH - map.width) / 2) : 0;
  const padY =
    map.height < VIEWPORT_HEIGHT
      ? Math.floor((VIEWPORT_HEIGHT - map.height) / 2)
      : 0;

  const displayGrid: (DisplayTile | null)[][] = [];

  for (let y = 0; y < VIEWPORT_HEIGHT; y++) {
    const row: (DisplayTile | null)[] = [];
    for (let x = 0; x < VIEWPORT_WIDTH; x++) {
      // Translate viewport coordinates to map coordinates, accounting for padding
      const mapX = topLeftX + x - padX;
      const mapY = topLeftY + y - padY;

      // If the coordinate is outside the map boundaries, it's padding space
      if (mapX < 0 || mapX >= map.width || mapY < 0 || mapY >= map.height) {
        row.push(null);
        continue;
      }

      const coord = `${mapX},${mapY}`;
      const isVisible = visibleTiles.has(coord);
      const isExplored = exploredTiles.has(coord);

      if (!isVisible && !isExplored) {
        row.push(null);
        continue;
      }

      const tile = map.tiles[mapY][mapX];
      row.push({
        char: tile.char,
        color: tile.walkable ? theme.dim : theme.primary,
        isDim: !isVisible,
      });
    }
    displayGrid.push(row);
  }

  const allEntities: (Entity | Actor | Item)[] = [
    ...items,
    ...entities,
    ...actors,
  ];

  for (const entity of allEntities) {
    const { x: entityX, y: entityY } = entity.position;
    const coord = `${entityX},${entityY}`;

    if (visibleTiles.has(coord)) {
      // Translate map coordinates to viewport coordinates
      const viewX = entityX - topLeftX + padX;
      const viewY = entityY - topLeftY + padY;

      if (
        viewX >= 0 &&
        viewX < VIEWPORT_WIDTH &&
        viewY >= 0 &&
        viewY < VIEWPORT_HEIGHT &&
        displayGrid[viewY]?.[viewX]
      ) {
        let color = theme.primary;
        if (entity.interaction) {
          color = theme.accent;
        }
        if (entity.color) {
          color = entity.color;
        }

        let effectiveChar = entity.char;
        if (entity.states) {
          if (entity.interaction?.type === 'door') {
            effectiveChar = entity.states[entity.interaction.isOpen ? 'open' : 'closed'] ?? entity.char;
          } else if (entity.interaction?.type === 'chest') {
            effectiveChar = entity.states[entity.interaction.isLooted ? 'looted' : 'unlooted'] ?? entity.char;
          } else {
            effectiveChar = entity.states.default ?? entity.char;
          }
        }

        displayGrid[viewY][viewX]!.char = effectiveChar;
        displayGrid[viewY][viewX]!.color = color;
        displayGrid[viewY][viewX]!.isDim = false;
      }
    }
  }

  const { x: playerX, y: playerY } = player.position;
  const viewX = playerX - topLeftX + padX;
  const viewY = playerY - topLeftY + padY;

  if (
    viewX >= 0 &&
    viewX < VIEWPORT_WIDTH &&
    viewY >= 0 &&
    viewY < VIEWPORT_HEIGHT &&
    displayGrid[viewY]?.[viewX]
  ) {
    displayGrid[viewY][viewX]!.backgroundColor = theme.accent;
    displayGrid[viewY][viewX]!.color = theme.textOnPrimary;
    displayGrid[viewY][viewX]!.isDim = false;
  }

  return displayGrid;
};

const MapView: React.FC<Props> = ({ state, isDimmed }) => {
  const theme = useTheme();
  const { actors, visibleTiles } = state;
  const displayGrid = React.useMemo(
    () => createDisplayGrid(state, theme),
    [
      state.map,
      state.actors,
      state.items,
      state.entities,
      state.visibleTiles,
      state.exploredTiles,
      theme,
    ]
  );
  const player = actors.find((a) => a.isPlayer);

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        <Text bold dimColor={isDimmed} color={theme.accent}>
          He Walks Unseen
        </Text>
        {player && (
          <Text dimColor={isDimmed} color={theme.primary}>
            HP:{' '}
            <Text
              color={player.hp.current < player.hp.max * 0.3 ? theme.critical : theme.primary}
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
                  return <Box width={2} key={`${x},${y}`}><Text> </Text></Box>; // Render empty space for unexplored tiles
                }
                return (
                  <Box width={2} key={`${x},${y}`} justifyContent="center">
                    <Text
                      color={tile.color}
                      backgroundColor={tile.backgroundColor}
                      dimColor={isDimmed || tile.isDim}
                    >
                      {tile.char}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default MapView;

