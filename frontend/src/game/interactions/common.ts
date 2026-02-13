import { hasComponent } from '../../core/components'
import { isInBounds, movePosition, type Direction2D, type Position2D, type Position3D } from '../../core/position'
import { currentPosition, extendNormal, type WorldLineState } from '../../core/worldLine'
import { objectsAt, type TimeCube } from '../../core/timeCube'
import type { InteractionResult } from './types'

export function oppositeDirection(direction: Direction2D): Direction2D {
  switch (direction) {
    case 'north':
      return 'south'
    case 'south':
      return 'north'
    case 'east':
      return 'west'
    case 'west':
      return 'east'
  }
}

export function nextNormalStep(
  worldLine: WorldLineState,
  boardSize: number,
  timeDepth: number,
  direction: Direction2D,
): InteractionResult<{ current: Position3D; next: Position3D }> {
  const current = currentPosition(worldLine)

  if (!current) {
    return { ok: false, error: { kind: 'Internal', message: 'Empty world line' } }
  }

  const spatial = movePosition(current, direction)

  if (!isInBounds(spatial, boardSize)) {
    return { ok: false, error: { kind: 'OutOfBounds' } }
  }

  const nextTime = current.t + 1

  if (nextTime >= timeDepth) {
    return { ok: false, error: { kind: 'TimeBoundary' } }
  }

  return {
    ok: true,
    value: {
      current,
      next: { x: spatial.x, y: spatial.y, t: nextTime },
    },
  }
}

export function waitStep(
  worldLine: WorldLineState,
  timeDepth: number,
): InteractionResult<{ current: Position3D; next: Position3D }> {
  const current = currentPosition(worldLine)

  if (!current) {
    return { ok: false, error: { kind: 'Internal', message: 'Empty world line' } }
  }

  const nextTime = current.t + 1

  if (nextTime >= timeDepth) {
    return { ok: false, error: { kind: 'TimeBoundary' } }
  }

  return {
    ok: true,
    value: {
      current,
      next: { x: current.x, y: current.y, t: nextTime },
    },
  }
}

export function extendWorldLineOrError(
  worldLine: WorldLineState,
  next: Position3D,
): InteractionResult<WorldLineState> {
  const result = extendNormal(worldLine, next)

  if (!result.ok) {
    if (result.error.kind === 'SelfIntersection') {
      return { ok: false, error: { kind: 'SelfIntersection' } }
    }

    return { ok: false, error: { kind: 'Internal', message: 'Invalid normal step' } }
  }

  return { ok: true, value: result.value }
}

export function blockingObjectsAt(cube: TimeCube, position: Position3D) {
  return objectsAt(cube, position).filter((object) =>
    hasComponent(object.archetype.components, 'BlocksMovement'),
  )
}

export function firstObjectIdAt(cube: TimeCube, position: Position3D): string | undefined {
  return objectsAt(cube, position)[0]?.id
}

export function pos2(position: Position3D | Position2D): Position2D {
  return { x: position.x, y: position.y }
}
