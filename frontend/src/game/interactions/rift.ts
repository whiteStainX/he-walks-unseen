import { extendViaRift } from '../../core/worldLine'
import { resolveRift } from '../../core/rift'
import { blockingObjectsAt } from './common'
import type { InteractionHandler } from './types'

export const riftInteractionHandler: InteractionHandler<'ApplyRift'> = {
  kind: 'ApplyRift',
  execute(state, action) {
    const current = state.worldLine.path.at(-1)

    if (!current) {
      return {
        ok: false,
        error: { kind: 'Internal', message: 'Empty world line' },
        status: 'Internal error: empty world line',
      }
    }

    const riftResult = resolveRift({
      current,
      instruction: action.instruction,
      settings: state.riftSettings,
      resources: state.riftResources,
      boardWidth: state.boardWidth,
      boardHeight: state.boardHeight,
      timeDepth: state.timeDepth,
    })

    if (!riftResult.ok) {
      switch (riftResult.error.kind) {
        case 'InvalidTargetTime':
        case 'InvalidTargetSpace':
          return {
            ok: false,
            error: { kind: 'InvalidRiftTarget' },
            status:
              riftResult.error.kind === 'InvalidTargetTime'
                ? 'Invalid rift target time'
                : 'Invalid rift target position',
          }
        case 'InsufficientEnergy':
          return {
            ok: false,
            error: { kind: 'InsufficientEnergy' },
            status: 'Insufficient energy for rift',
          }
      }
    }

    const next = riftResult.value.target

    if (blockingObjectsAt(state.cube, next).length > 0) {
      return {
        ok: false,
        error: { kind: 'BlockedByObject' },
        status: 'Blocked by object',
      }
    }

    const worldLineResult = extendViaRift(state.worldLine, next)

    if (!worldLineResult.ok) {
      return {
        ok: false,
        error:
          worldLineResult.error.kind === 'SelfIntersection'
            ? { kind: 'SelfIntersection' }
            : { kind: 'Internal', message: 'Invalid rift extension' },
        status:
          worldLineResult.error.kind === 'SelfIntersection'
            ? 'Blocked by self-intersection'
            : 'Invalid rift',
      }
    }

    state.worldLine = worldLineResult.value

    if (state.riftResources.energy !== null) {
      state.riftResources.energy -= riftResult.value.energyCost
    }

    return {
      ok: true,
      outcome: { kind: 'Rifted', to: next, mode: riftResult.value.mode },
      status: `rift(${riftResult.value.mode}) to (${next.x}, ${next.y}, t=${next.t})`,
    }
  },
}
