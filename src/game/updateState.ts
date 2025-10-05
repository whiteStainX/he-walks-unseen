import { nanoid } from 'nanoid';
import type { GameState, MessageType, Entity, DoorInteraction, ChestInteraction, StairsInteraction } from '../engine/state.js';
import { GameAction } from '../input/actions.js';
import { createInitialGameState } from './initialState.js';
import { runEnemyTurn } from './ai.js';
import { resolveAttack } from './combat.js';
import { equip } from './equipment.js';
import { updateVisibility } from './visibility.js';
import { processStatusEffects } from './statusEffects.js';

interface MovementDelta {
  dx: number;
  dy: number;
  successMessage: string;
}

const MOVEMENT_DELTAS: Partial<Record<GameAction, MovementDelta>> = {
  [GameAction.MOVE_NORTH]: { dx: 0, dy: -1, successMessage: 'You move north.' },
  [GameAction.MOVE_SOUTH]: { dx: 0, dy: 1, successMessage: 'You move south.' },
  [GameAction.MOVE_EAST]: { dx: 1, dy: 0, successMessage: 'You move east.' },
  [GameAction.MOVE_WEST]: { dx: -1, dy: 0, successMessage: 'You move west.' },
};

function isBlocked(state: GameState, x: number, y: number): boolean {
  if (x < 0 || x >= state.map.width || y < 0 || y >= state.map.height) {
    return true;
  }
  return !state.map.tiles[y][x].walkable;
}

function handleInventoryAction(
  state: GameState,
  action: GameAction
): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player || !player.inventory || player.inventory.length === 0) {
    return {
      ...state,
      phase: 'PlayerTurn',
      selectedItemIndex: undefined,
      message: 'Your inventory is empty.',
      messageType: 'info',
    };
  }

  const groupedInventory = Object.keys(
    player.inventory.reduce((acc, item) => {
      acc[item.name] = (acc[item.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  const inventorySize = groupedInventory.length;
  let newIndex = state.selectedItemIndex ?? 0;

  switch (action) {
    case GameAction.CLOSE_INVENTORY:
      return {
        ...state,
        phase: 'PlayerTurn',
        selectedItemIndex: undefined,
        message: '',
      };

    case GameAction.SELECT_NEXT_ITEM:
      newIndex = (newIndex + 1) % inventorySize;
      return { ...state, selectedItemIndex: newIndex };

    case GameAction.SELECT_PREVIOUS_ITEM:
      newIndex = (newIndex - 1 + inventorySize) % inventorySize;
      return { ...state, selectedItemIndex: newIndex };

    case GameAction.CONFIRM_SELECTION:
      const selectedItemName = groupedInventory[newIndex];
      if (!selectedItemName) return state;

      const itemToUse = player.inventory.find(
        (item) => item.name === selectedItemName
      );
      if (!itemToUse) return state;

      let message = `You can't use the ${itemToUse.name}.`;
      let messageType: MessageType = 'info';
      let finalActors = state.actors;
      let newPlayerHp = player.hp.current;

      if (itemToUse.effect === 'heal' && typeof itemToUse.potency === 'number') {
        newPlayerHp = Math.min(
          player.hp.max,
          player.hp.current + itemToUse.potency
        );
        message = `You use the ${itemToUse.name} and heal for ${itemToUse.potency} HP.`;
        messageType = 'heal';
      } else if (itemToUse.effect === 'damage' && typeof itemToUse.potency === 'number') {
        newPlayerHp -= itemToUse.potency;
        message = `The ${itemToUse.name} damages you for ${itemToUse.potency} HP!`;
        messageType = 'damage';
      }

      const updatedPlayer = {
        ...player,
        hp: { ...player.hp, current: newPlayerHp },
      };

      const itemIndexToRemove = player.inventory.findIndex(
        (item) => item.id === itemToUse.id
      );
      const newInventory = player.inventory.filter(
        (_, index) => index !== itemIndexToRemove
      );
      const playerWithNewInventory = { ...updatedPlayer, inventory: newInventory };

      finalActors = state.actors.map((a) =>
        a.id === player.id ? playerWithNewInventory : a
      );

      return {
        ...state,
        actors: finalActors,
        phase: 'EnemyTurn',
        selectedItemIndex: undefined,
        message,
        messageType,
      };

    case GameAction.DROP_ITEM:
      const selectedItemNameToDrop = groupedInventory[newIndex];
      if (!selectedItemNameToDrop) return state;

      const itemToDrop = player.inventory.find(
        (item) => item.name === selectedItemNameToDrop
      );
      if (!itemToDrop) return state;

      const itemIndexToRemoveDropping = player.inventory.findIndex(
        (item) => item.id === itemToDrop.id
      );

      const newInventoryDropping = player.inventory.filter(
        (_, index) => index !== itemIndexToRemoveDropping
      );

      const updatedPlayerDropping = {
        ...player,
        inventory: newInventoryDropping,
      };

      const finalActorsDropping = state.actors.map((a) =>
        a.id === player.id ? updatedPlayerDropping : a
      );

      const droppedItem = { ...itemToDrop, position: player.position };

      return {
        ...state,
        actors: finalActorsDropping,
        items: [...state.items, droppedItem],
        phase: 'EnemyTurn',
        selectedItemIndex: undefined,
        message: `You drop the ${itemToDrop.name}.`,
        messageType: 'info',
      };

    case GameAction.EQUIP_ITEM: {
      const selectedItemName = groupedInventory[newIndex];
      if (!selectedItemName) return state;

      const itemToEquip = player.inventory.find(
        (item) => item.name === selectedItemName
      );
      if (!itemToEquip || !itemToEquip.equipment) {
        return {
          ...state,
          message: `You can't equip the ${itemToEquip?.name}.`,
          messageType: 'info',
        };
      }

      const stateAfterEquip = equip(state, player.id, itemToEquip.id);

      return {
        ...stateAfterEquip,
        phase: 'EnemyTurn',
        selectedItemIndex: undefined,
      };
    }

    default:
      return state;
  }
}

export function handleInteraction(state: GameState, x: number, y: number): GameState {
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
            interaction: { ...e.interaction, type: 'door', isOpen: newIsOpen } as DoorInteraction,
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

      const lootItemTemplate = state.items.find(i => i.id === interaction.loot);

      const lootItem = {
        id: nanoid(),
        name: lootItemTemplate?.name || 'Unidentified Potion',
        char: lootItemTemplate?.char || '!',
        color: lootItemTemplate?.color || 'magenta',
        position: player.position,
        effect: lootItemTemplate?.effect || ('heal' as const),
        potency: lootItemTemplate?.potency || 5,
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
            interaction: { ...e.interaction, type: 'chest', isLooted: true } as ChestInteraction,
          };
        }
        return e;
      });

      newState = {
        ...state,
        actors: newActors,
        entities: newEntities,
        message: 'You open the chest and find a potion.',
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
      const nextFloor = direction === 'down' ? currentFloor + 1 : currentFloor - 1;

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

function handleTargeting(state: GameState, action: GameAction): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) return state;

  if (action === GameAction.CANCEL_TARGETING) {
    return { ...state, phase: 'PlayerTurn', message: '' };
  }

  const delta = MOVEMENT_DELTAS[action];
  if (!delta) {
    return state;
  }

  const targetX = player.position.x + delta.dx;
  const targetY = player.position.y + delta.dy;

  return handleInteraction(state, targetX, targetY);
}

const COMBAT_OPTIONS = ['Attack', 'Cancel'];

function handleCombatMenuAction(
  state: GameState,
  action: GameAction
): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  const targetEnemy = state.actors.find((a) => a.id === state.combatTargetId);

  if (!player || !targetEnemy) {
    // Should not happen, but as a safeguard, exit the menu
    return { ...state, phase: 'PlayerTurn', combatTargetId: undefined };
  }

  switch (action) {
    case GameAction.SELECT_PREVIOUS_COMBAT_OPTION: {
      const newIndex =
        (state.selectedCombatMenuIndex ?? 0) - 1 < 0
          ? COMBAT_OPTIONS.length - 1
          : (state.selectedCombatMenuIndex ?? 0) - 1;
      return { ...state, selectedCombatMenuIndex: newIndex };
    }
    case GameAction.SELECT_NEXT_COMBAT_OPTION: {
      const newIndex =
        ((state.selectedCombatMenuIndex ?? 0) + 1) % COMBAT_OPTIONS.length;
      return { ...state, selectedCombatMenuIndex: newIndex };
    }
    case GameAction.CANCEL_COMBAT: {
      return {
        ...state,
        phase: 'PlayerTurn',
        combatTargetId: undefined,
        message: '',
      };
    }
    case GameAction.CONFIRM_COMBAT_ACTION: {
      const selectedOption = COMBAT_OPTIONS[state.selectedCombatMenuIndex ?? 0];
      if (selectedOption === 'Attack') {
        const stateAfterAttack = resolveAttack(player, targetEnemy, state);
        return {
          ...stateAfterAttack,
          phase: 'EnemyTurn',
          combatTargetId: undefined,
        };
      } else {
        // Cancel
        return {
          ...state,
          phase: 'PlayerTurn',
          combatTargetId: undefined,
          message: '',
        };
      }
    }
    default:
      return state;
  }
}

function handlePlayerAction(state: GameState, action: GameAction): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) return state;

  if (action === GameAction.OPEN_INVENTORY) {
    const hasItems = player.inventory && player.inventory.length > 0;
    return {
      ...state,
      phase: 'Inventory',
      selectedItemIndex: hasItems ? 0 : undefined,
      message: hasItems
        ? 'Select an item to use.'
        : 'Your inventory is empty.',
      messageType: 'info',
    };
  }

  if (action === GameAction.PICKUP_ITEM) {
    const item = state.items.find(
      (i) =>
        i.position.x === player.position.x && i.position.y === player.position.y
    );

    if (!item) {
      return {
        ...state,
        message: 'There is nothing here to pick up.',
        messageType: 'info',
      };
    }

    const playerInventory = player.inventory || [];
    const updatedInventory = [...playerInventory, item];
    const updatedPlayer = { ...player, inventory: updatedInventory };

    const updatedItems = state.items.filter((i) => i.id !== item.id);

    const updatedActors = state.actors.map((a) =>
      a.id === player.id ? updatedPlayer : a
    );

    return {
      ...state,
      actors: updatedActors,
      items: updatedItems,
      message: `You picked up the ${item.name}.`,
      messageType: 'info',
      phase: 'PlayerTurn',
    };
  }

  if (action === GameAction.START_INTERACTION) {
    return {
      ...state,
      phase: 'Targeting',
      message: 'Which direction?',
    };
  }

  const delta = MOVEMENT_DELTAS[action];
  if (!delta) {
    return state;
  }

  const targetX = player.position.x + delta.dx;
  const targetY = player.position.y + delta.dy;

  const targetEntity = state.entities.find(
    (e) => e.position.x === targetX && e.position.y === targetY
  );

  if (targetEntity && targetEntity.interaction?.type === 'stairs') {
    return handleInteraction(state, targetX, targetY);
  }

  const targetEnemy = state.actors.find(
    (a) => !a.isPlayer && a.position.x === targetX && a.position.y === targetY
  );

  if (targetEnemy) {
    return {
      ...state,
      phase: 'CombatMenu',
      combatTargetId: targetEnemy.id,
      selectedCombatMenuIndex: 0,
      message: `You engage the ${targetEnemy.name}.`,
      messageType: 'info',
    };
  }

  if (isBlocked(state, targetX, targetY)) {
    const boundaryMessage =
      targetX < 0 ||
      targetX >= state.map.width ||
      targetY < 0 ||
      targetY >= state.map.height
        ? "You can't step beyond the treeline."
        : 'A wall blocks your way.';
    return { ...state, message: boundaryMessage, messageType: 'info' };
  }

  const actorsAfterPlayerMove = state.actors.map((actor) =>
    actor.id === player.id
      ? { ...actor, position: { x: targetX, y: targetY } }
      : actor
  );

  return updateVisibility({
    ...state,
    actors: actorsAfterPlayerMove,
    items: state.items,
    message: delta.successMessage,
    messageType: 'info',
    phase: 'EnemyTurn',
  });
}

function handleEnemyTurns(state: GameState): GameState {
  const enemies = state.actors.filter((a) => !a.isPlayer);
  let stateAfterEnemyTurns = state;

  for (const enemy of enemies) {
    if (stateAfterEnemyTurns.actors.find((a) => a.id === enemy.id)) {
      stateAfterEnemyTurns = runEnemyTurn(enemy, stateAfterEnemyTurns);
    }
  }

  // Process status effects for all actors at the end of the round
  const stateAfterEffects = processStatusEffects(stateAfterEnemyTurns);

  // Check for player death after status effects have been processed
  const player = stateAfterEffects.actors.find((a) => a.isPlayer);
  if (!player || player.hp.current <= 0) {
    // The processStatusEffects function might have already set the 'Loss' phase
    if (stateAfterEffects.phase === 'Loss') {
      return stateAfterEffects;
    }
    return {
      ...stateAfterEffects,
      phase: 'Loss',
      message: stateAfterEffects.message || 'You have been defeated.',
      messageType: 'death',
    };
  }

  return { ...stateAfterEffects, phase: 'PlayerTurn' };
}

export function applyActionToState(
  state: GameState,
  action: GameAction
): GameState {
  if (action === GameAction.QUIT) {
    return { ...state, message: 'Press Ctrl+C to exit the simulation.' };
  }

  if (state.phase === 'Win' || state.phase === 'Loss') {
    return state;
  }

  if (state.phase === 'PlayerTurn') {
    return handlePlayerAction(state, action);
  }

  if (state.phase === 'Inventory') {
    return handleInventoryAction(state, action);
  }

  if (state.phase === 'Targeting') {
    return handleTargeting(state, action);
  }

  if (state.phase === 'CombatMenu') {
    return handleCombatMenuAction(state, action);
  }

  return state;
}

export function processEnemyTurns(state: GameState): GameState {
  if (state.phase !== 'EnemyTurn') {
    return state;
  }
  return handleEnemyTurns(state);
}