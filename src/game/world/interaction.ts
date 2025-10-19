import type {
  GameState,
  DoorInteraction,
  ChestInteraction,
  PortalInteraction,
  ConversationInteraction,
} from '../../engine/state.js';
import { updateVisibility } from '../../lib/visibility.js';;
import { createInitialGameState } from '../initialState.js';
import { addLogMessage } from '../../lib/logger.js';;
import { replacer, reviver } from '../../engine/persistence.js';
import { beginConversation } from '../dialogue/conversation.js';
import { generateLoot } from '../items/loot.js';

export function handleInteraction(
  state: GameState,
  x: number,
  y: number
): boolean {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) return false;

  const entity = state.entities.find(
    (e) => e.position.x === x && e.position.y === y
  );

  if (!entity || !entity.interaction) {
    addLogMessage(state, 'There is nothing to interact with here.', 'info');
    return false;
  }

  switch (entity.interaction.type) {
    case 'door': {
      const interaction = entity.interaction as DoorInteraction;
      const isOpen = interaction.isOpen;
      const newIsOpen = !isOpen;

      const doorEntity = state.entities.find(e => e.id === entity.id);
      if (doorEntity) {
        (doorEntity.interaction as DoorInteraction).isOpen = newIsOpen;
        doorEntity.char = newIsOpen ? doorEntity.states?.open ?? '-' : doorEntity.states?.closed ?? '+';
      }

      state.map.tiles[y][x].walkable = newIsOpen;
      state.map.tiles[y][x].transparent = newIsOpen;

      updateVisibility(state);
      state.phase = 'EnemyTurn';

      addLogMessage(state, newIsOpen ? 'You open the door.' : 'You close the door.', 'info');
      return false;
    }

    case 'chest': {
      const interaction = entity.interaction as ChestInteraction;
      if (interaction.isLooted) {
        addLogMessage(state, 'The chest is empty.', 'info');
        return false;
      }

      const generatedItems = generateLoot(interaction.lootTableId);

      if (generatedItems.length === 0) {
        addLogMessage(state, 'The chest is empty.', 'info');
      } else {
        player.inventory = player.inventory || [];
        let message = 'You open the chest and find:';
        for (const item of generatedItems) {
          player.inventory.push(item);
          message += ` ${item.name},`;
        }
        addLogMessage(state, message.slice(0, -1) + '.', 'info'); // Remove trailing comma
      }

      const chestEntity = state.entities.find(e => e.id === entity.id);
      if (chestEntity) {
        (chestEntity.interaction as ChestInteraction).isLooted = true;
        chestEntity.char = chestEntity.states?.looted ?? ' ';
      }

      state.phase = 'EnemyTurn';
      return false;
    }

    case 'portal': {
      const interaction = entity.interaction as PortalInteraction;
      const { targetMapId, targetPortalId } = interaction;
      const { currentMapId, mapStates } = state;

      mapStates.set(
        currentMapId,
        JSON.parse(JSON.stringify(state, replacer), reviver)
      );

      let newState: GameState;
      let targetPosition: { x: number, y: number };

      if (mapStates.has(targetMapId)) {
        const cachedState = mapStates.get(targetMapId)!;
        newState = JSON.parse(JSON.stringify(cachedState, replacer), reviver);

        const targetPortal = newState.entities.find(
          (e) => e.interaction?.type === 'portal' && (e.interaction as PortalInteraction).id === targetPortalId
        );
        if (!targetPortal) {
          throw new Error(`Could not find target portal "${targetPortalId}" in map "${targetMapId}"`);
        }
        targetPosition = targetPortal.position;

        const playerIndex = newState.actors.findIndex((a) => a.isPlayer);
        const currentPlayer = JSON.parse(JSON.stringify(player, replacer), reviver);
        currentPlayer.position = targetPosition;

        if (playerIndex !== -1) {
          newState.actors[playerIndex] = currentPlayer;
        } else {
          newState.actors.push(currentPlayer);
        }
      } else {
        const playerForNewState = JSON.parse(JSON.stringify(player, replacer), reviver);

        newState = createInitialGameState({
          player: playerForNewState,
          mapId: targetMapId,
          mapStates,
          theme: state.activeTheme,
        });

        const newPlayer = newState.actors.find((a) => a.isPlayer);
        const targetPortal = newState.entities.find(
          (e) => e.interaction?.type === 'portal' && (e.interaction as PortalInteraction).id === targetPortalId
        );
        if (newPlayer && targetPortal) {
          newPlayer.position = targetPortal.position;
        } else {
          throw new Error(`Could not place player in new map "${targetMapId}" at portal "${targetPortalId}"`);
        }
      }

      newState.activeTheme = state.activeTheme;

      // Preserve the master mapStates object. The newState (whether from cache or
      // new creation) might have an outdated copy.
      newState.mapStates = mapStates;

      Object.keys(state).forEach((key) => delete (state as any)[key]);
      Object.assign(state, newState);

      updateVisibility(state);
      state.phase = 'EnemyTurn';
      return false;
    }
    case 'conversation': {
      const interaction = entity.interaction as ConversationInteraction;
      const { parcelId } = interaction;
      return beginConversation(state, parcelId, entity.name);
    }
  }
  return false;
}
