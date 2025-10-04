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
        inventory.map((item, index) => {
          const isSelected = isInventoryMode && index === selectedItemIndex;
          return (
            <Box key={item.id}>
              <Text color={isSelected ? 'cyan' : 'white'}>
                {isSelected ? '> ' : '  '}
                {item.name}
              </Text>
            </Box>
          );
        })
      )}
    </Box>
  );
};

export default InventoryView;