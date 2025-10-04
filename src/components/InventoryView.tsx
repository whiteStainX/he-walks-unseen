import React from 'react';
import { Box, Text } from 'ink';
import type { Item, GameState } from '../engine/state.js';

interface InventoryViewProps {
  inventory: Item[];
  selectedItemIndex?: number;
  phase: GameState['phase'];
}

const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  selectedItemIndex,
  phase,
}) => {
  const isInventoryMode = phase === 'Inventory';

  return (
    <Box flexDirection="column" borderStyle="single" padding={1}>
      <Text bold>Inventory</Text>
      {inventory.length === 0 ? (
        <Text>Your inventory is empty.</Text>
      ) : (
        Object.entries(
          inventory.reduce((acc, item) => {
            acc[item.name] = (acc[item.name] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).map(([name, count], index) => {
          const isSelected = isInventoryMode && index === selectedItemIndex;
          return (
            <Box key={name}>
              <Text color={isSelected ? 'cyan' : 'white'}>
                {isSelected ? '> ' : '  '}
                {name}
                {count > 1 ? ` (x${count})` : ''}
              </Text>
            </Box>
          );
        })
      )}
      {isInventoryMode && inventory.length > 0 && (
        <Box marginTop={1}>
          <Text>Press 'd' to drop an item.</Text>
        </Box>
      )}
    </Box>
  );
};

export default InventoryView;