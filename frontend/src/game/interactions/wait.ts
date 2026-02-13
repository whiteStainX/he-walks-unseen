import { blockingObjectsAt, extendWorldLineOrError, waitStep } from './common'
import type { InteractionHandler } from './types'

export const waitInteractionHandler: InteractionHandler<'Wait'> = {
  kind: 'Wait',
  execute(state) {
    const step = waitStep(state.worldLine, state.timeDepth)

    if (!step.ok) {
      switch (step.error.kind) {
        case 'TimeBoundary':
          return { ok: false, error: step.error, status: 'Blocked by time boundary' }
        default:
          return { ok: false, error: step.error, status: 'Internal wait error' }
      }
    }

    if (blockingObjectsAt(state.cube, step.value.next).length > 0) {
      return {
        ok: false,
        error: { kind: 'BlockedByObject' },
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
            : 'Invalid wait',
      }
    }

    state.worldLine = worldLineResult.value

    return {
      ok: true,
      outcome: { kind: 'Moved', to: step.value.next },
      status: `wait at t=${step.value.next.t}`,
    }
  },
}

