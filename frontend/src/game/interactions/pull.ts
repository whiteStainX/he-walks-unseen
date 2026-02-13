import { hasComponent } from '../../core/components'
import { isInBounds, movePosition } from '../../core/position'
import { applyRelocationsFromTime, objectsAt } from '../../core/timeCube'
import { blockingObjectsAt, extendWorldLineOrError, nextNormalStep, oppositeDirection } from './common'
import type { InteractionHandler } from './types'

export const pullInteractionHandler: InteractionHandler<'Pull'> = {
  kind: 'Pull',
  execute(state, action) {
    if (!state.interactionConfig.allowPull) {
      return {
        ok: false,
        error: { kind: 'NotPullable' },
        status: 'Pull is disabled',
      }
    }

    const step = nextNormalStep(state.worldLine, state.boardSize, state.timeDepth, action.direction)

    if (!step.ok) {
      switch (step.error.kind) {
        case 'OutOfBounds':
          return { ok: false, error: step.error, status: 'Blocked by boundary' }
        case 'TimeBoundary':
          return { ok: false, error: step.error, status: 'Blocked by time boundary' }
        default:
          return { ok: false, error: step.error, status: 'Internal pull error' }
      }
    }

    if (blockingObjectsAt(state.cube, step.value.next).length > 0) {
      return {
        ok: false,
        error: { kind: 'BlockedByObject' },
        status: 'Blocked by object',
      }
    }

    const behind = movePosition(step.value.current, oppositeDirection(action.direction))

    if (!isInBounds(behind, state.boardSize)) {
      return {
        ok: false,
        error: { kind: 'NothingToPull' },
        status: 'Nothing to pull',
      }
    }

    const objectsBehind = objectsAt(state.cube, {
      x: behind.x,
      y: behind.y,
      t: step.value.current.t,
    })

    if (objectsBehind.length === 0) {
      return {
        ok: false,
        error: { kind: 'NothingToPull' },
        status: 'Nothing to pull',
      }
    }

    const pullable = objectsBehind.find((object) => hasComponent(object.archetype.components, 'Pullable'))

    if (!pullable) {
      return {
        ok: false,
        error: { kind: 'NotPullable' },
        status: 'Target is not pullable',
      }
    }

    const relocationResult = applyRelocationsFromTime(state.cube, step.value.next.t, [
      {
        id: pullable.id,
        from: {
          x: pullable.position.x,
          y: pullable.position.y,
          t: step.value.next.t,
        },
        to: {
          x: step.value.current.x,
          y: step.value.current.y,
          t: step.value.next.t,
        },
      },
    ])

    if (!relocationResult.ok) {
      switch (relocationResult.error.kind) {
        case 'TargetOccupied':
          return {
            ok: false,
            error: { kind: 'BlockedByObject', objectId: relocationResult.error.id },
            status: 'Blocked by object',
          }
        case 'EntityNotInSlice':
          return {
            ok: false,
            error: { kind: 'NotPullable' },
            status: 'Target cannot be pulled in this timeline',
          }
        case 'OutOfBounds':
        case 'InvalidRelocationTime':
        case 'EntityAlreadyExists':
        case 'EntityNotFound':
          return {
            ok: false,
            error: { kind: 'Internal', message: 'Invalid pull relocation target' },
            status: 'Invalid pull target',
          }
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
            : 'Invalid pull movement',
      }
    }

    state.cube = relocationResult.value
    state.worldLine = worldLineResult.value

    return {
      ok: true,
      outcome: {
        kind: 'Pulled',
        to: step.value.next,
        movedObjectIds: [pullable.id],
      },
      status: `pulled 1 object to (${step.value.next.x}, ${step.value.next.y}, t=${step.value.next.t})`,
    }
  },
}
