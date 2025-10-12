import React from 'react';
import { Box, Text } from 'ink';
import type { Actor, EquipmentSlot } from '../engine/state.js';
import { useTheme } from '../themes.js';

interface EquipmentViewProps {
  player: Actor;
}

const EquipmentView: React.FC<EquipmentViewProps> = ({ player }) => {
  const theme = useTheme();
  const equipmentSlots: EquipmentSlot[] = ['weapon', 'armor'];

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1} borderColor={theme.border}>
      <Text bold color={theme.accent}>Equipment</Text>
      {equipmentSlots.map(slot => {
        const item = player.equipment?.[slot];
        const itemName =
          item && item.identified === false && item.unidentifiedName
            ? item.unidentifiedName
            : item
            ? item.name
            : 'None';
        const attackBonus = item?.equipment?.bonuses.attack ?? 0;
        const defenseBonus = item?.equipment?.bonuses.defense ?? 0;

        let bonusText = '';
        if (attackBonus > 0) {
          bonusText += ` (Atk +${attackBonus})`;
        }
        if (defenseBonus > 0) {
          bonusText += ` (Def +${defenseBonus})`;
        }

        return (
          <Box key={slot}>
            <Text color={theme.primary}>
              {slot.charAt(0).toUpperCase() + slot.slice(1)}: {itemName}
              {bonusText && <Text color={theme.accent}>{bonusText}</Text>}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};

export default EquipmentView;