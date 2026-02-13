import { moveInteractionHandler } from './move'
import { pullInteractionHandler } from './pull'
import { pushInteractionHandler } from './push'
import { riftInteractionHandler } from './rift'
import type {
  InteractionAction,
  InteractionHandlerResult,
  InteractionRegistry,
  InteractionState,
} from './types'
import { waitInteractionHandler } from './wait'

export const interactionRegistry: InteractionRegistry = {
  Move: moveInteractionHandler,
  Wait: waitInteractionHandler,
  ApplyRift: riftInteractionHandler,
  Push: pushInteractionHandler,
  Pull: pullInteractionHandler,
}

export function executeRegisteredInteraction(
  state: InteractionState,
  action: InteractionAction,
): InteractionHandlerResult {
  switch (action.kind) {
    case 'Move':
      return interactionRegistry.Move.execute(state, action)
    case 'Wait':
      return interactionRegistry.Wait.execute(state, action)
    case 'ApplyRift':
      return interactionRegistry.ApplyRift.execute(state, action)
    case 'Push':
      return interactionRegistry.Push.execute(state, action)
    case 'Pull':
      return interactionRegistry.Pull.execute(state, action)
  }
}
