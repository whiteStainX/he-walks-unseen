import { nanoid } from 'nanoid';
import type { GameState, MessageType, Entity, DoorInteraction, ChestInteraction, StairsInteraction, Actor } from '../engine/state.js';
import { GameAction as PlayerAction } from '../input/actions.js';
import { createInitialGameState } from './initialState.js';
import { runEnemyTurn } from './ai.js';
import { handleAttack } from './combat.js';
import type { GameAction } from './actions.js';
import { eventBus, DamageDealtEvent, ActorDiedEvent, AttackResolvedEvent } from '../engine/events.js';
import { getResource } from '../engine/resourceManager.js';
import { checkForLevelUp } from './progression.js';

interface MovementDelta {
  dx: number;
  dy: number;
}

const MOVEMENT_DELTAS: Partial<Record<PlayerAction, MovementDelta>> = {
  [PlayerAction.MOVE_NORTH]: { dx: 0, dy: -1 },
  [PlayerAction.MOVE_SOUTH]: { dx: 0, dy: 1 },
  [PlayerAction.MOVE_EAST]: { dx: 1, dy: 0 },
  [PlayerAction.MOVE_WEST]: { dx: -1, dy: 0 },
};

function isBlocked(state: GameState, x: number, y: number): boolean {
  if (x < 0 || x >= state.map.width || y < 0 || y >= state.map.height) {
    return true;
  }
  return !state.map.tiles[y][x].walkable;
}

function handleInventoryAction(
  state: GameState,
  action: PlayerAction
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
    case PlayerAction.CLOSE_INVENTORY:
      return {
        ...state,
        phase: 'PlayerTurn',
        selectedItemIndex: undefined,
        message: '',
      };

    case PlayerAction.SELECT_NEXT_ITEM:
      newIndex = (newIndex + 1) % inventorySize;
      return { ...state, selectedItemIndex: newIndex };

    case PlayerAction.SELECT_PREVIOUS_ITEM:
      newIndex = (newIndex - 1 + inventorySize) % inventorySize;
      return { ...state, selectedItemIndex: newIndex };

    case PlayerAction.CONFIRM_SELECTION:
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

      if (itemToUse.effect === 'heal') {
        newPlayerHp = Math.min(
          player.hp.max,
          player.hp.current + itemToUse.potency
        );
        message = `You use the ${itemToUse.name} and heal for ${itemToUse.potency} HP.`;
        messageType = 'heal';
      } else if (itemToUse.effect === 'damage') {
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

    case PlayerAction.DROP_ITEM:
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

      newState = {
        ...state,
        entities: newEntities,
        map: { ...state.map, tiles: newTiles },
        message: newIsOpen ? 'You open the door.' : 'You close the door.',
        phase: 'EnemyTurn',
      };
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
        newState = floorStates.get(nextFloor)!;
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

function handleTargeting(state: GameState, action: PlayerAction): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) return state;

  if (action === PlayerAction.CANCEL_TARGETING) {
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

function handlePlayerAction(state: GameState, action: PlayerAction): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) return state;

  let newState = { ...state, log: [] };

  if (action === PlayerAction.OPEN_INVENTORY) {
    const hasItems = player.inventory && player.inventory.length > 0;
    return {
      ...newState,
      phase: 'Inventory',
      selectedItemIndex: hasItems ? 0 : undefined,
      message: hasItems
        ? 'Select an item to use.'
        : 'Your inventory is empty.',
      messageType: 'info',
    };
  }

  if (action === PlayerAction.PICKUP_ITEM) {
    const item = state.items.find(
      (i) =>
        i.position.x === player.position.x && i.position.y === player.position.y
    );

    if (!item) {
      return {
        ...newState,
        message: 'There is nothing here to pick up.',
        messageType: 'info',
      };
    }

    return {
      ...newState,
      pendingAction: { type: 'pickup', actorId: player.id, itemId: item.id },
    };
  }

  if (action === PlayerAction.START_INTERACTION) {
    return {
      ...newState,
      phase: 'Targeting',
      message: 'Which direction?',
    };
  }

  const delta = MOVEMENT_DELTAS[action];
  if (!delta) {
    return newState;
  }

  const targetX = player.position.x + delta.dx;
  const targetY = player.position.y + delta.dy;

  const targetEnemy = state.actors.find(
    (a) => !a.isPlayer && a.position.x === targetX && a.position.y === targetY
  );

  if (targetEnemy) {
    return {
      ...newState,
      pendingAction: { type: 'attack', attackerId: player.id, defenderId: targetEnemy.id },
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
    return { ...newState, message: boundaryMessage, messageType: 'info' };
  }

  return {
    ...newState,
    pendingAction: { type: 'move', actorId: player.id, target: { x: targetX, y: targetY } },
  };
}

function handleEnemyTurns(state: GameState): GameState {
  const enemies = state.actors.filter((a) => !a.isPlayer);
  let stateAfterEnemyTurns = state;

  for (const enemy of enemies) {
    if (stateAfterEnemyTurns.actors.find((a) => a.id === enemy.id)) {
      stateAfterEnemyTurns = runEnemyTurn(enemy, stateAfterEnemyTurns);
    }
  }

  const player = stateAfterEnemyTurns.actors.find((a) => a.isPlayer);
  if (!player || player.hp.current <= 0) {
    return {
      ...stateAfterEnemyTurns,
      phase: 'Loss',
      message: 'You have been defeated.',
      messageType: 'death',
    };
  }

  return { ...stateAfterEnemyTurns, phase: 'PlayerTurn' };
}

function processAction(state: GameState): GameState {
  if (!state.pendingAction) {
    return state;
  }

  const action = state.pendingAction as GameAction;
  let newState = { ...state };

  switch (action.type) {
    case 'move': {
      const actor = newState.actors.find((a) => a.id === action.actorId);
      if (actor) {
        const newActors = newState.actors.map((a) =>
          a.id === action.actorId ? { ...a, position: action.target } : a
        );
        newState = { ...newState, actors: newActors };
      }
      break;
    }
    case 'attack': {
      const attacker = newState.actors.find((a) => a.id === action.attackerId);
      const defender = newState.actors.find((a) => a.id === action.defenderId);
      if (attacker && defender) {
        newState = handleAttack(attacker, defender, newState);
      }
      break;
    }
    case 'pickup': {
      const actor = newState.actors.find((a) => a.id === action.actorId);
      const item = newState.items.find((i) => i.id === action.itemId);
      if (actor && item) {
        const newInventory = [...(actor.inventory || []), item];
        const newActors = newState.actors.map((a) =>
          a.id === action.actorId ? { ...a, inventory: newInventory } : a
        );
        const newItems = newState.items.filter((i) => i.id !== action.itemId);
        newState = { ...newState, actors: newActors, items: newItems, log: [...newState.log, `You picked up the ${item.name}.`] };
      }
      break;
    }
  }

  return { ...newState, pendingAction: undefined, phase: 'EnemyTurn' };
}

function onAttackResolved(state: GameState, event: AttackResolvedEvent): GameState {
  const attacker = state.actors.find(a => a.id === event.attackerId);
  const defender = state.actors.find(a => a.id === event.defenderId);
  if (attacker && defender) {
    let message = `${attacker.name} attacks ${defender.name}`;
    if (event.didHit) {
      message += ' and hits.';
    } else {
      message += ' and misses.';
    }
    return { ...state, log: [...state.log, message] };
  }
  return state;
}

function onDamageDealt(state: GameState, event: DamageDealtEvent): GameState {
  let newState = { ...state };
  const { targetId, damage } = event;

  const newActors = newState.actors.map((actor) => {
    if (actor.id === targetId) {
      const newHp = actor.hp.current - damage;
      if (newHp <= 0) {
        const actorDiedEvent: ActorDiedEvent = { actorId: actor.id };
        eventBus.emit('actorDied', actorDiedEvent);
      }
      return { ...actor, hp: { ...actor.hp, current: newHp } };
    }
    return actor;
  });

  newState = { ...newState, actors: newActors };

  const defender = newState.actors.find(a => a.id === targetId);
  if (defender) {
    newState = { ...newState, log: [...newState.log, `${defender.name} takes ${damage} damage.`] };
  }

  return newState;
}

function onActorDied(state: GameState, event: ActorDiedEvent): GameState {
  let newState = { ...state };
  const { actorId } = event;

  const actor = newState.actors.find((a) => a.id === actorId);
  if (!actor) return newState;

  newState = { ...newState, log: [...newState.log, `${actor.name} dies!`] };

  // Grant XP to player
  if (!actor.isPlayer) {
    const player = newState.actors.find(a => a.isPlayer);
    if (player && actor.xp) {
      const newPlayer = { ...player, xp: (player.xp ?? 0) + actor.xp };
      const newActors = newState.actors.map(a => a.id === player.id ? newPlayer : a);
      newState = { ...newState, actors: newActors, log: [...newState.log, `You gain ${actor.xp} XP.`] };
      newState = checkForLevelUp(newState);
    }
  }

  // Handle loot drops
  if (actor.loot) {
    const itemTemplates = getResource<any[]>('items');
    const lootTemplate = itemTemplates.find(i => i.id === actor.loot);
    if (lootTemplate) {
      const newItem = {
        ...lootTemplate,
        id: nanoid(),
        position: actor.position,
      };
      const newItems = [...newState.items, newItem];
      newState = { ...newState, items: newItems, log: [...newState.log, `The ${actor.name} drops a ${lootTemplate.name}.`] };
    }
  }

  // Remove dead actor
  const newActors = newState.actors.filter((a) => a.id !== actorId);
  newState = { ...newState, actors: newActors };

  return newState;
}

export function applyActionToState(
  state: GameState,
  action: PlayerAction
): GameState {
  if (action === PlayerAction.QUIT) {
    return { ...state, message: 'Press Ctrl+C to exit the simulation.' };
  }

  if (state.phase === 'Win' || state.phase === 'Loss') {
    return state;
  }

  let stateAfterPlayerAction: GameState;
  if (state.phase === 'PlayerTurn') {
    stateAfterPlayerAction = handlePlayerAction(state, action);
  } else if (state.phase === 'Inventory') {
    stateAfterPlayerAction = handleInventoryAction(state, action);
  } else if (state.phase === 'Targeting') {
    stateAfterPlayerAction = handleTargeting(state, action);
  } else {
    stateAfterPlayerAction = state;
  }

  if (stateAfterPlayerAction.pendingAction) {
    const attackResolvedEvents: AttackResolvedEvent[] = [];
    const damageDealtEvents: DamageDealtEvent[] = [];
    const actorDiedEvents: ActorDiedEvent[] = [];

    const onAttackResolvedListener = (event: AttackResolvedEvent) =>
      attackResolvedEvents.push(event);
    const onDamageDealtListener = (event: DamageDealtEvent) =>
      damageDealtEvents.push(event);
    const onActorDiedListener = (event: ActorDiedEvent) =>
      actorDiedEvents.push(event);

    eventBus.on('attackResolved', onAttackResolvedListener);
    eventBus.on('damageDealt', onDamageDealtListener);
    eventBus.on('actorDied', onActorDiedListener);

    let stateAfterAction = processAction(stateAfterPlayerAction);

    for (const event of attackResolvedEvents) {
      stateAfterAction = onAttackResolved(stateAfterAction, event);
    }

    for (const event of damageDealtEvents) {
      stateAfterAction = onDamageDealt(stateAfterAction, event);
    }

    for (const event of actorDiedEvents) {
      stateAfterAction = onActorDied(stateAfterAction, event);
    }

    eventBus.off('attackResolved', onAttackResolvedListener);
    eventBus.off('damageDealt', onDamageDealtListener);
    eventBus.off('actorDied', onActorDiedListener);

    return stateAfterAction;
  }

  return stateAfterPlayerAction;
}

export function processEnemyTurns(state: GameState): GameState {
  if (state.phase !== 'EnemyTurn') {
    return state;
  }
  return handleEnemyTurns(state);
}
