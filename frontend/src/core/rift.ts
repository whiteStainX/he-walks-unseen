import { isInBounds, type Position2D, type Position3D } from './position'
import type { Result } from './result'

export interface RiftSettings {
  defaultDelta: number
  baseEnergyCost: number
}

export interface RiftResources {
  energy: number | null
}

export type RiftInstruction =
  | { kind: 'default' }
  | { kind: 'delta'; delta: number; targetSpatial?: Position2D }
  | { kind: 'tunnel'; target: Position3D; tunnelId?: string }

export type RiftResolveError =
  | { kind: 'InvalidTargetTime'; t: number }
  | { kind: 'InvalidTargetSpace'; x: number; y: number }
  | { kind: 'InsufficientEnergy'; required: number; available: number }

export interface RiftResolution {
  target: Position3D
  energyCost: number
  mode: RiftInstruction['kind']
}

export interface ResolveRiftInput {
  current: Position3D
  instruction?: RiftInstruction
  settings: RiftSettings
  resources: RiftResources
  boardWidth: number
  boardHeight: number
  timeDepth: number
}

function resolveInstructionTarget(current: Position3D, instruction: RiftInstruction): Position3D {
  switch (instruction.kind) {
    case 'default':
      return {
        x: current.x,
        y: current.y,
        t: current.t - 1,
      }
    case 'delta':
      return {
        x: instruction.targetSpatial?.x ?? current.x,
        y: instruction.targetSpatial?.y ?? current.y,
        t: current.t + instruction.delta,
      }
    case 'tunnel':
      return instruction.target
  }
}

export function resolveRift(input: ResolveRiftInput): Result<RiftResolution, RiftResolveError> {
  const instruction = input.instruction ?? { kind: 'default' as const }
  const normalizedInstruction: RiftInstruction =
    instruction.kind === 'default'
      ? { kind: 'delta', delta: -Math.abs(input.settings.defaultDelta) }
      : instruction

  const target = resolveInstructionTarget(input.current, normalizedInstruction)

  if (target.t < 0 || target.t >= input.timeDepth) {
    return { ok: false, error: { kind: 'InvalidTargetTime', t: target.t } }
  }

  if (!isInBounds(target, input.boardWidth, input.boardHeight)) {
    return { ok: false, error: { kind: 'InvalidTargetSpace', x: target.x, y: target.y } }
  }

  if (
    input.resources.energy !== null &&
    input.resources.energy < input.settings.baseEnergyCost
  ) {
    return {
      ok: false,
      error: {
        kind: 'InsufficientEnergy',
        required: input.settings.baseEnergyCost,
        available: input.resources.energy,
      },
    }
  }

  return {
    ok: true,
    value: {
      target,
      energyCost: input.settings.baseEnergyCost,
      mode: instruction.kind,
    },
  }
}
