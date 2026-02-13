import { firstObjectIdAt, nextNormalStep, blockingObjectsAt, extendWorldLineOrError } from './common'
import type { InteractionHandler } from './types'

export const moveInteractionHandler: InteractionHandler<'Move'> = {
  kind: 'Move',
  execute(state, action) {
    const step = nextNormalStep(state.worldLine, state.boardSize, state.timeDepth, action.direction)

    if (!step.ok) {
      switch (step.error.kind) {
        case 'OutOfBounds':
          return { ok: false, error: step.error, status: 'Blocked by boundary' }
        case 'TimeBoundary':
          return { ok: false, error: step.error, status: 'Blocked by time boundary' }
        default:
          return { ok: false, error: step.error, status: 'Internal movement error' }
      }
    }

    if (blockingObjectsAt(state.cube, step.value.next).length > 0) {
      return {
        ok: false,
        error: { kind: 'BlockedByObject', objectId: firstObjectIdAt(state.cube, step.value.next) },
        status: 'Blocked by object',
      }
    }

    const worldLineResult = extendWorldLineOrError(state.worldLine, step.value.next)

    if (!worldLineResult.ok) {
      return {
        ok: false,
        error: worldLineResult.error,
        status:
          worldLineResult.error.kind === 'SelfIntersection'
            ? 'Blocked by self-intersection'
            : 'Invalid move',
      }
    }

    state.worldLine = worldLineResult.value

    return {
      ok: true,
      outcome: { kind: 'Moved', to: step.value.next },
      status: `move to (${step.value.next.x}, ${step.value.next.y}, t=${step.value.next.t})`,
    }
  },
}

