import React from 'react';
import { Box, Text } from 'ink';
import type { Actor, EquipmentSlot } from '../engine/state.js';

interface EquipmentViewProps {
  player: Actor;
}

const EquipmentView: React.FC<EquipmentViewProps> = ({ player }) => {
  const equipmentSlots: EquipmentSlot[] = ['weapon', 'armor'];

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text bold>Equipment</Text>
      {equipmentSlots.map(slot => {
        const item = player.equipment?.[slot];
        const itemName = item ? item.name : 'None';
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
            <Text>
              {slot.charAt(0).toUpperCase() + slot.slice(1)}: {itemName}
              {bonusText && <Text color="green">{bonusText}</Text>}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};

export default EquipmentView;