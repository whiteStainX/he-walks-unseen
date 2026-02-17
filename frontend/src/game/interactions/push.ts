import { hasComponent } from '../../core/components'
import { applyRelocationsFromTime, type ObjectRelocation } from '../../core/timeCube'
import { isInBounds, movePosition, type Direction2D, type Position2D, type Position3D } from '../../core/position'
import { blockingObjectsAt, extendWorldLineOrError, nextNormalStep } from './common'
import type { InteractionHandler, InteractionResult, InteractionState } from './types'

interface PushChainResult {
  chain: Position3D[]
  freeTarget: Position2D
  movedObjectIds: string[]
}

function collectPushChain(
  state: InteractionState,
  start: Position3D,
  direction: Direction2D,
): InteractionResult<PushChainResult> {
  let cursor: Position2D = { x: start.x, y: start.y }
  const chain: Position3D[] = []
  const movedObjectIds: string[] = []

  while (true) {
    const cell: Position3D = { x: cursor.x, y: cursor.y, t: start.t }
    const blockers = blockingObjectsAt(state.cube, cell)

    if (blockers.length === 0) {
      return {
        ok: true,
        value: {
          chain,
          freeTarget: cursor,
          movedObjectIds,
        },
      }
    }

    const pushable = blockers.find((object) => hasComponent(object.archetype.components, 'Pushable'))
    const nonPushableExists = blockers.some(
      (object) => !hasComponent(object.archetype.components, 'Pushable'),
    )

    if (!pushable || nonPushableExists) {
      return { ok: false, error: { kind: 'NotPushable' } }
    }

    chain.push(pushable.position)
    movedObjectIds.push(pushable.id)

    if (chain.length > state.interactionConfig.maxPushChain) {
      return {
        ok: false,
        error: {
          kind: 'PushChainTooLong',
          length: chain.length,
          max: state.interactionConfig.maxPushChain,
        },
      }
    }

    const nextCursor = movePosition(cursor, direction)

    if (!isInBounds(nextCursor, state.boardWidth, state.boardHeight)) {
      return { ok: false, error: { kind: 'NoSpaceToPush' } }
    }

    cursor = nextCursor
  }
}

export const pushInteractionHandler: InteractionHandler<'Push'> = {
  kind: 'Push',
  execute(state, action) {
    const step = nextNormalStep(
      state.worldLine,
      state.boardWidth,
      state.boardHeight,
      state.timeDepth,
      action.direction,
    )

    if (!step.ok) {
      switch (step.error.kind) {
        case 'OutOfBounds':
          return { ok: false, error: step.error, status: 'Blocked by boundary' }
        case 'TimeBoundary':
          return { ok: false, error: step.error, status: 'Blocked by time boundary' }
        default:
          return { ok: false, error: step.error, status: 'Internal push error' }
      }
    }

    const firstBlockers = blockingObjectsAt(state.cube, step.value.next)

    if (firstBlockers.length === 0) {
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
    }

    const chainResult = collectPushChain(state, step.value.next, action.direction)

    if (!chainResult.ok) {
      switch (chainResult.error.kind) {
        case 'NotPushable':
          return { ok: false, error: chainResult.error, status: 'Target is not pushable' }
        case 'PushChainTooLong':
          return { ok: false, error: chainResult.error, status: 'Push chain too long' }
        case 'NoSpaceToPush':
          return { ok: false, error: chainResult.error, status: 'No space to push' }
        default:
          return { ok: false, error: chainResult.error, status: 'Push blocked' }
      }
    }

    const relocations: ObjectRelocation[] = []

    for (let i = chainResult.value.chain.length - 1; i >= 0; i -= 1) {
      const from = chainResult.value.chain[i]
      const toSource = i === chainResult.value.chain.length - 1
        ? chainResult.value.freeTarget
        : chainResult.value.chain[i + 1]

      relocations.push({
        id: chainResult.value.movedObjectIds[i],
        from,
        to: { x: toSource.x, y: toSource.y, t: step.value.next.t },
      })
    }

    const relocationResult = applyRelocationsFromTime(state.cube, step.value.next.t, relocations)

    if (!relocationResult.ok) {
      switch (relocationResult.error.kind) {
        case 'TargetOccupied':
        case 'EntityNotInSlice':
          return {
            ok: false,
            error: { kind: 'NoSpaceToPush' },
            status: 'No space to push',
          }
        case 'OutOfBounds':
        case 'InvalidRelocationTime':
        case 'EntityNotFound':
          return { ok: false, error: { kind: 'NoSpaceToPush' }, status: 'No space to push' }
        default:
          return {
            ok: false,
            error: { kind: 'Internal', message: 'Failed to apply push relocation' },
            status: 'Push failed',
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
            : 'Invalid move',
      }
    }

    state.cube = relocationResult.value
    state.worldLine = worldLineResult.value

    return {
      ok: true,
      outcome: {
        kind: 'Pushed',
        to: step.value.next,
        movedObjectIds: chainResult.value.movedObjectIds,
      },
      status: `pushed ${chainResult.value.movedObjectIds.length} object(s) to (${step.value.next.x}, ${step.value.next.y}, t=${step.value.next.t})`,
    }
  },
}
