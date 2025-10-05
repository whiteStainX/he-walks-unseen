import { nanoid } from 'nanoid';
import type {
  GameState,
  DoorInteraction,
  ChestInteraction,
  StairsInteraction,
  Item,
} from '../engine/state.js';
import { updateVisibility } from './visibility.js';
import { createInitialGameState } from './initialState.js';

export function handleInteraction(
  state: GameState,
  x: number,
  y: number
): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) return state;

  const entity = state.entities.find(
    (e) => e.position.x === x && e.position.y === y
  );

  if (!entity || !entity.interaction) {
    return { ...state, message: 'There is nothing to interact with here.' };
  }

  let newState = { ...state };

  switch (entity.interaction.type) {
    case 'door': {
      const interaction = entity.interaction as DoorInteraction;
      const isOpen = interaction.isOpen;
      const newIsOpen = !isOpen;

      const newEntities = state.entities.map((e) => {
        if (e.id === entity.id) {
          return {
            ...e,
            char: newIsOpen ? '-' : '+',
            interaction: {
              ...e.interaction,
              type: 'door',
              isOpen: newIsOpen,
            } as DoorInteraction,
          };
        }
        return e;
      });

      const newTiles = state.map.tiles.map((row, tileY) =>
        row.map((tile, tileX) => {
          if (tileX === x && tileY === y) {
            return { ...tile, walkable: newIsOpen, transparent: newIsOpen };
          }
          return tile;
        })
      );

      newState = updateVisibility({
        ...state,
        entities: newEntities,
        map: { ...state.map, tiles: newTiles },
        message: newIsOpen ? 'You open the door.' : 'You close the door.',
        phase: 'EnemyTurn',
      });
      break;
    }

    case 'chest': {
      const interaction = entity.interaction as ChestInteraction;
      if (interaction.isLooted) {
        newState = { ...state, message: 'The chest is empty.' };
        break;
      }

      const lootItemTemplate = state.items.find((i) => i.id === interaction.loot);

      const lootItem: Item = {
        id: nanoid(),
        name: lootItemTemplate?.name || 'Unidentified Item',
        char: lootItemTemplate?.char || '!',
        color: lootItemTemplate?.color || 'magenta',
        position: player.position,
        effects: lootItemTemplate?.effects,
      };

      const newPlayerInventory = [...(player.inventory || []), lootItem];
      const newPlayer = { ...player, inventory: newPlayerInventory };

      const newActors = state.actors.map((a) =>
        a.id === player.id ? newPlayer : a
      );

      const newEntities = state.entities.map((e) => {
        if (e.id === entity.id) {
          return {
            ...e,
            interaction: {
              ...e.interaction,
              type: 'chest',
              isLooted: true,
            } as ChestInteraction,
          };
        }
        return e;
      });

      newState = {
        ...state,
        actors: newActors,
        entities: newEntities,
        message: `You open the chest and find a ${lootItem.name}.`,
        phase: 'EnemyTurn',
      };
      break;
    }

    case 'stairs': {
      const interaction = entity.interaction as StairsInteraction;
      const currentFloor = state.currentFloor;
      const floorStates = state.floorStates;

      // Save current floor state
      floorStates.set(currentFloor, state);

      const direction = interaction.direction;
      const nextFloor =
        direction === 'down' ? currentFloor + 1 : currentFloor - 1;

      if (floorStates.has(nextFloor)) {
        // Recalculate visibility upon returning to a floor
        newState = updateVisibility(floorStates.get(nextFloor)!);
      } else {
        newState = createInitialGameState({
          player,
          floor: nextFloor,
          floorStates,
        });
      }
      break;
    }
  }

  return newState;
}
