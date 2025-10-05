import React from 'react';
import { Box, Text } from 'ink';
import type { Item, GameState } from '../engine/state.js';

interface InventoryViewProps {
  inventory: Item[];
  selectedItemIndex?: number;
  phase: GameState['phase'];
}

const getDisplayName = (item: Item) =>
  item.identified === false && item.unidentifiedName
    ? item.unidentifiedName
    : item.name;

const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  selectedItemIndex,
  phase,
}) => {
  const isInventoryMode = phase === 'Inventory';
  const isIdentifyMode = phase === 'IdentifyMenu';
  const title = isIdentifyMode ? 'Identify Item' : 'Inventory';

  const renderGroupedInventory = () => {
    return Object.entries(
      inventory.reduce((acc, item) => {
        const displayName = getDisplayName(item);
        acc[displayName] = (acc[displayName] || 0) + 1;
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
    });
  };

  const renderFlatInventory = () => {
    return inventory.map((item, index) => {
      const isSelected = isIdentifyMode && index === selectedItemIndex;
      const displayName = getDisplayName(item);
      // Use a unique key that includes the item's own ID
      return (
        <Box key={`${item.id}-${index}`}>
          <Text color={isSelected ? 'cyan' : 'white'}>
            {isSelected ? '> ' : '  '}
            {displayName}
          </Text>
        </Box>
      );
    });
  };

  return (
    <Box flexDirection="column" borderStyle="single" padding={1}>
      <Text bold>{title}</Text>
      {inventory.length === 0 ? (
        <Text>Your inventory is empty.</Text>
      ) : isIdentifyMode ? (
        renderFlatInventory()
      ) : (
        renderGroupedInventory()
      )}
      {isInventoryMode && inventory.length > 0 && (
        <Box marginTop={1}>
          <Text>e: equip, d: drop, enter: use, esc: close</Text>
        </Box>
      )}
      {isIdentifyMode && inventory.length > 0 && (
        <Box marginTop={1}>
          <Text>enter: identify, esc: cancel</Text>
        </Box>
      )}
    </Box>
  );
};

export default InventoryView;