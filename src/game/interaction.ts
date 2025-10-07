import { nanoid } from 'nanoid';
import type {
  GameState,
  DoorInteraction,
  ChestInteraction,
  PortalInteraction,
  Item,
} from '../engine/state.js';
import { updateVisibility } from './visibility.js';
import { createInitialGameState } from './initialState.js';
import { addLogMessage } from './logger.js';

export function handleInteraction(
  state: GameState,
  x: number,
  y: number
): void {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) return;

  const entity = state.entities.find(
    (e) => e.position.x === x && e.position.y === y
  );

  if (!entity || !entity.interaction) {
    addLogMessage(state, 'There is nothing to interact with here.', 'info');
    return;
  }

  switch (entity.interaction.type) {
    case 'door': {
      const interaction = entity.interaction as DoorInteraction;
      const isOpen = interaction.isOpen;
      const newIsOpen = !isOpen;

      const doorEntity = state.entities.find(e => e.id === entity.id);
      if (doorEntity) {
        (doorEntity.interaction as DoorInteraction).isOpen = newIsOpen;
        doorEntity.char = newIsOpen ? '-' : '+';
      }

      state.map.tiles[y][x].walkable = newIsOpen;
      state.map.tiles[y][x].transparent = newIsOpen;

      updateVisibility(state);
      state.phase = 'EnemyTurn';

      addLogMessage(state, newIsOpen ? 'You open the door.' : 'You close the door.', 'info');
      break;
    }

    case 'chest': {
      const interaction = entity.interaction as ChestInteraction;
      if (interaction.isLooted) {
        addLogMessage(state, 'The chest is empty.', 'info');
        break;
      }

      const lootItemTemplate = state.items.find(
        (i) => i.id === interaction.loot
      );

      const lootItem: Item = {
        id: nanoid(),
        name: lootItemTemplate?.name || 'Unidentified Item',
        char: lootItemTemplate?.char || '!',
        color: lootItemTemplate?.color || 'magenta',
        position: player.position,
        effects: lootItemTemplate?.effects,
      };

      player.inventory = player.inventory || [];
      player.inventory.push(lootItem);

      const chestEntity = state.entities.find(e => e.id === entity.id);
      if (chestEntity) {
        (chestEntity.interaction as ChestInteraction).isLooted = true;
      }

      state.phase = 'EnemyTurn';

      addLogMessage(state, `You open the chest and find a ${lootItem.name}.`, 'info');
      break;
    }

    case 'portal': {
      const interaction = entity.interaction as PortalInteraction;
      const { targetMapId, targetPosition } = interaction;
      const { currentMapId, mapStates } = state;

      // Save current map state
      mapStates.set(currentMapId, state);

      if (mapStates.has(targetMapId)) {
        const newState = mapStates.get(targetMapId)!;
        Object.assign(state, newState);
        const playerIndex = state.actors.findIndex((a) => a.isPlayer);

        // carry over the player from the previous state
        if (playerIndex !== -1) {
          state.actors[playerIndex] = { ...player, position: targetPosition };
        }
      } else {
        const newState = createInitialGameState({
          player,
          mapId: targetMapId,
          mapStates,
        });
        Object.assign(state, newState);
        // The player in the new state is already a copy of our current player,
        // but we need to set their position to the portal's target.
        const newPlayer = state.actors.find((a) => a.isPlayer);
        if (newPlayer) {
          newPlayer.position = targetPosition;
        }
      }

      updateVisibility(state);
      state.phase = 'EnemyTurn';
      break;
    }
  }
}
