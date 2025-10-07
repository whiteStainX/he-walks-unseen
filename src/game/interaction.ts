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
): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) return state;

  const entity = state.entities.find(
    (e) => e.position.x === x && e.position.y === y
  );

  if (!entity || !entity.interaction) {
    return addLogMessage(
      state,
      'There is nothing to interact with here.',
      'info'
    );
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

      const stateAfterDoorToggle = updateVisibility({
        ...state,
        entities: newEntities,
        map: { ...state.map, tiles: newTiles },
        phase: 'EnemyTurn',
      } as GameState);

      newState = addLogMessage(
        stateAfterDoorToggle,
        newIsOpen ? 'You open the door.' : 'You close the door.',
        'info'
      );
      break;
    }

    case 'chest': {
      const interaction = entity.interaction as ChestInteraction;
      if (interaction.isLooted) {
        newState = addLogMessage(state, 'The chest is empty.', 'info');
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

      const stateAfterLoot: GameState = {
        ...state,
        actors: newActors,
        entities: newEntities,
        phase: 'EnemyTurn',
      };

      newState = addLogMessage(
        stateAfterLoot,
        `You open the chest and find a ${lootItem.name}.`,
        'info'
      );
      break;
    }

    case 'portal': {
      const interaction = entity.interaction as PortalInteraction;
      const { targetMapId, targetPosition } = interaction;
      const { currentMapId, mapStates } = state;

      // Save current map state
      mapStates.set(currentMapId, state);

      if (mapStates.has(targetMapId)) {
        newState = mapStates.get(targetMapId)!;
        const playerIndex = newState.actors.findIndex((a) => a.isPlayer);

        // carry over the player from the previous state
        if (playerIndex !== -1) {
          newState.actors[playerIndex] = { ...player, position: targetPosition };
        }
      } else {
        newState = createInitialGameState({
          player,
          mapId: targetMapId,
          mapStates,
        });
        // The player in the new state is already a copy of our current player,
        // but we need to set their position to the portal's target.
        const newPlayer = newState.actors.find((a) => a.isPlayer);
        if (newPlayer) {
          newPlayer.position = targetPosition;
        }
      }

      newState = updateVisibility(newState);
      break;
    }
  }

  return newState;
}
