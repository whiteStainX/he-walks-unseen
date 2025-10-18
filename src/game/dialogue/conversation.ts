import { getResource, hasResource, setResource } from '../../engine/resourceManager.js';
import type { GameState } from '../../engine/state.js';
import type { Parcel } from '../../types/parcel.js';
import { addLogMessage } from '../../lib/logger.js';;

function clearConversation(state: GameState): void {
  state.conversation = undefined;
}

const parcelCache = new Map<string, Parcel>();

function cacheParcel(parcelId: string, parcel: Parcel): void {
  parcelCache.set(parcelId, parcel);

  // Some subsystems historically resolved parcels directly via the parcelId key.
  // Mirroring the data in the resource cache preserves that behaviour without
  // forcing callers to know about the shared `parcels` document.
  if (!hasResource(parcelId)) {
    setResource(parcelId, parcel);
  }
}

function tryGetCachedParcel(parcelId: string): Parcel | undefined {
  if (parcelCache.has(parcelId)) {
    return parcelCache.get(parcelId);
  }

  if (!hasResource(parcelId)) {
    return undefined;
  }

  try {
    const parcel = getResource<Parcel>(parcelId);

    parcelCache.set(parcelId, parcel);
    return parcel;
  } catch (error) {
    console.error(
      `[conversation] Failed to retrieve cached parcel "${parcelId}".`,
      error
    );
  }

  return undefined;
}

function getConversationParcel(parcelId: string): Parcel | undefined {
  const cachedParcel = parcelCache.get(parcelId);

  if (cachedParcel) {
    return cachedParcel;
  }

  try {
    const parcels = getResource<Record<string, Parcel>>('parcels');
    const parcel = parcels?.[parcelId];

    if (parcel) {
      cacheParcel(parcelId, parcel);
      return parcel;
    }
  } catch (error) {
    console.error(
      `[conversation] Failed to resolve parcel "${parcelId}" because the parcels resource could not be loaded.`,
      error
    );

    return tryGetCachedParcel(parcelId);
  }

  return tryGetCachedParcel(parcelId);
}

export function endConversation(
  state: GameState,
  message?: string
): void {
  clearConversation(state);
  state.phase = 'PlayerTurn';

  if (message) {
    addLogMessage(state, message, 'info');
  }
}

export function beginConversation(
  state: GameState,
  parcelId: string,
  speakerName?: string
): boolean {
  const conversationData = getConversationParcel(parcelId);

  if (!conversationData) {
    console.error(
      `[conversation] Parcel "${parcelId}" was not found in the loaded resources.`
    );
    endConversation(
      state,
      "They don't respond. It feels like their thoughts are elsewhere."
    );
    return false;
  }

  const startNode = conversationData.nodes['start'];

  if (!startNode) {
    console.error(
      `[conversation] Parcel "${parcelId}" is missing a "start" node.`
    );
    endConversation(
      state,
      'The moment passes; there is no conversation to be had.'
    );
    return false;
  }

  state.phase = 'Dialogue';
  state.conversation = {
    parcelId,
    currentNodeId: 'start',
    selectedChoiceIndex: 0,
  };

  if (speakerName) {
    addLogMessage(state, `You begin talking to ${speakerName}.`, 'info');
  } else {
    addLogMessage(state, 'You strike up a conversation.', 'info');
  }

  return true;
}

export function resolveConversationParcel(parcelId: string): Parcel | undefined {
  return getConversationParcel(parcelId);
}
