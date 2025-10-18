import { nanoid } from 'nanoid';
import { getResource } from '../../engine/resourceManager.js';
import { instantiate } from '../../engine/prefab.js';
import type { Item } from '../../engine/state.js';

interface LootTableItem {
  id: string;
  weight: number;
  min: number;
  max: number;
}

interface LootTable {
  items: LootTableItem[];
}

export function generateLoot(lootTableId: string): Item[] {
  const lootTables = getResource<Record<string, LootTable>>('lootTables');
  const table = lootTables[lootTableId];

  if (!table) {
    console.warn(`Loot table "${lootTableId}" not found.`);
    return [];
  }

  const generatedItems: Item[] = [];

  for (const lootItem of table.items) {
    // Simple weighted random selection (can be improved for more complex scenarios)
    // For now, we'll just add items based on their weight relative to a random roll
    // and the min/max quantity.
    const roll = Math.random() * 100; // Roll between 0 and 100

    if (roll < lootItem.weight) {
      const quantity = Math.floor(Math.random() * (lootItem.max - lootItem.min + 1)) + lootItem.min;
      for (let i = 0; i < quantity; i++) {
        const itemPrefab = instantiate(lootItem.id);
        if (itemPrefab) {
          generatedItems.push({
            ...(itemPrefab as Item),
            id: nanoid(),
            // Position will be set when added to game state (e.g., player inventory)
            position: { x: 0, y: 0 }, // Placeholder position
          });
        }
      }
    }
  }

  return generatedItems;
}
