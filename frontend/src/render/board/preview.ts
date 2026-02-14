import { hasComponent } from '../../core/components'
import { isInBounds, movePosition, type Direction2D, type Position3D } from '../../core/position'
import { objectsAt, type TimeCube } from '../../core/timeCube'
import { currentPosition, type WorldLineState } from '../../core/worldLine'

export type PreviewMode = 'Move' | 'Push' | 'Pull'

export interface PreviewIntent {
  mode: PreviewMode
  direction: Direction2D
}

export interface ActionPreview {
  mode: PreviewMode
  from: Position3D
  to: Position3D
  blocked: boolean
  reason?: string
}

function oppositeDirection(direction: Direction2D): Direction2D {
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

function blockingObjects(cube: TimeCube, position: Position3D) {
  return objectsAt(cube, position).filter((object) =>
    hasComponent(object.archetype.components, 'BlocksMovement'),
  )
}

function isPushPreviewBlocked(input: {
  cube: TimeCube
  boardSize: number
  maxPushChain: number
  to: Position3D
  direction: Direction2D
}): { blocked: boolean; reason?: string } {
  const { cube, boardSize, maxPushChain, to, direction } = input

  const firstBlockers = blockingObjects(cube, to)

  if (firstBlockers.length === 0) {
    return { blocked: false }
  }

  let cursor = { x: to.x, y: to.y }
  let chainLength = 0

  while (true) {
    const cell = { x: cursor.x, y: cursor.y, t: to.t }
    const blockers = blockingObjects(cube, cell)

    if (blockers.length === 0) {
      return { blocked: false }
    }

    const allPushable = blockers.every((object) =>
      hasComponent(object.archetype.components, 'Pushable'),
    )

    if (!allPushable) {
      return { blocked: true, reason: 'Target not pushable' }
    }

    chainLength += 1

    if (chainLength > maxPushChain) {
      return { blocked: true, reason: 'Push chain too long' }
    }

    const next = movePosition(cursor, direction)

    if (!isInBounds(next, boardSize)) {
      return { blocked: true, reason: 'No space to push' }
    }

    cursor = next
  }
}

function isPullPreviewBlocked(input: {
  cube: TimeCube
  boardSize: number
  from: Position3D
  to: Position3D
  direction: Direction2D
}): { blocked: boolean; reason?: string } {
  const { cube, boardSize, from, to, direction } = input

  if (blockingObjects(cube, to).length > 0) {
    return { blocked: true, reason: 'Blocked by object' }
  }

  const behind = movePosition(from, oppositeDirection(direction))

  if (!isInBounds(behind, boardSize)) {
    return { blocked: true, reason: 'Nothing to pull' }
  }

  const behindObjects = objectsAt(cube, {
    x: behind.x,
    y: behind.y,
    t: from.t,
  })
  const hasPullable = behindObjects.some((object) =>
    hasComponent(object.archetype.components, 'Pullable'),
  )

  if (!hasPullable) {
    return { blocked: true, reason: 'Nothing to pull' }
  }

  return { blocked: false }
}

export function buildActionPreview(input: {
  cube: TimeCube
  worldLine: WorldLineState
  boardSize: number
  timeDepth: number
  intent: PreviewIntent | null
  maxPushChain: number
}): ActionPreview | null {
  const { cube, worldLine, boardSize, timeDepth, intent, maxPushChain } = input

  if (!intent) {
    return null
  }

  const from = currentPosition(worldLine)

  if (!from) {
    return null
  }

  const nextSpatial = movePosition(from, intent.direction)
  const nextTime = from.t + 1

  if (!isInBounds(nextSpatial, boardSize)) {
    return {
      mode: intent.mode,
      from,
      to: { x: from.x, y: from.y, t: nextTime },
      blocked: true,
      reason: 'Out of bounds',
    }
  }

  if (nextTime >= timeDepth) {
    return {
      mode: intent.mode,
      from,
      to: { x: nextSpatial.x, y: nextSpatial.y, t: from.t },
      blocked: true,
      reason: 'Time boundary',
    }
  }

  const to = { x: nextSpatial.x, y: nextSpatial.y, t: nextTime }

  switch (intent.mode) {
    case 'Move': {
      const blocked = blockingObjects(cube, to).length > 0
      return {
        mode: intent.mode,
        from,
        to,
        blocked,
        reason: blocked ? 'Blocked by object' : undefined,
      }
    }
    case 'Push': {
      const pushResult = isPushPreviewBlocked({
        cube,
        boardSize,
        maxPushChain,
        to,
        direction: intent.direction,
      })
      return {
        mode: intent.mode,
        from,
        to,
        blocked: pushResult.blocked,
        reason: pushResult.reason,
      }
    }
    case 'Pull': {
      const pullResult = isPullPreviewBlocked({
        cube,
        boardSize,
        from,
        to,
        direction: intent.direction,
      })
      return {
        mode: intent.mode,
        from,
        to,
        blocked: pullResult.blocked,
        reason: pullResult.reason,
      }
    }
  }
}
