import { hasComponent } from './components'
import type { ResolvedObjectInstance } from './objects'
import { manhattanDistance, type Position2D, type Position3D } from './position'
import { objectsAt, objectsAtTime, type TimeCube } from './timeCube'
import { positionsAtTime, type WorldLineState } from './worldLine'

export interface DetectionConfig {
  enabled: boolean
  delayTurns: number
  maxDistance: number
}

export interface DetectionEvent {
  enemyId: string
  enemyPosition: Position3D
  observedPlayer: Position3D
  observedTurn: number
}

export interface DetectionReport {
  detected: boolean
  atTime: number
  events: DetectionEvent[]
}

function isValidConfig(config: DetectionConfig): boolean {
  return config.delayTurns >= 1 && config.maxDistance >= 0
}

function isDetectorObject(object: ResolvedObjectInstance): boolean {
  return (
    object.archetype.kind === 'enemy' ||
    hasComponent(object.archetype.components, 'Patrol')
  )
}

function isVisionOccludedAt(
  cube: TimeCube,
  cell: Position2D,
  time: number,
): boolean {
  return objectsAt(cube, { x: cell.x, y: cell.y, t: time }).some((object) =>
    hasComponent(object.archetype.components, 'BlocksVision'),
  )
}

/**
 * Deterministic center-to-center grid trace with diagonal support.
 * Uses DDA stepping and steps both axes on tie to keep behavior symmetric.
 */
export function traceLineCells(from: Position2D, to: Position2D): Position2D[] {
  if (from.x === to.x && from.y === to.y) {
    return [from]
  }

  const dx = to.x - from.x
  const dy = to.y - from.y
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  const stepX = Math.sign(dx)
  const stepY = Math.sign(dy)
  const cells: Position2D[] = [{ x: from.x, y: from.y }]
  let x = from.x
  let y = from.y

  if (absDx === 0) {
    while (y !== to.y) {
      y += stepY
      cells.push({ x, y })
    }
    return cells
  }

  if (absDy === 0) {
    while (x !== to.x) {
      x += stepX
      cells.push({ x, y })
    }
    return cells
  }

  const tDeltaX = 1 / absDx
  const tDeltaY = 1 / absDy
  let tMaxX = 0.5 * tDeltaX
  let tMaxY = 0.5 * tDeltaY

  while (x !== to.x || y !== to.y) {
    if (tMaxX < tMaxY) {
      x += stepX
      tMaxX += tDeltaX
    } else if (tMaxY < tMaxX) {
      y += stepY
      tMaxY += tDeltaY
    } else {
      x += stepX
      y += stepY
      tMaxX += tDeltaX
      tMaxY += tDeltaY
    }

    cells.push({ x, y })
  }

  return cells
}

export function hasLineOfSight(input: {
  cube: TimeCube
  from: Position2D
  to: Position2D
  atTime: number
}): boolean {
  const cells = traceLineCells(input.from, input.to)

  // Endpoints are actor cells (detector/player target) and should not self-occlude.
  for (let index = 1; index < cells.length - 1; index += 1) {
    if (isVisionOccludedAt(input.cube, cells[index], input.atTime)) {
      return false
    }
  }

  return true
}

export function evaluateDetectionV1(input: {
  cube: TimeCube
  worldLine: WorldLineState
  currentTime: number
  config: DetectionConfig
  configByEnemyId?: Record<string, DetectionConfig>
}): DetectionReport {
  const { cube, worldLine, currentTime, config, configByEnemyId } = input

  const detectors = objectsAtTime(cube, currentTime).filter(isDetectorObject)

  if (detectors.length === 0) {
    return { detected: false, atTime: currentTime, events: [] }
  }

  const observedPlayersByTime: Record<number, ReturnType<typeof positionsAtTime>> = {}
  const events: DetectionEvent[] = []

  for (const detector of detectors) {
    const detectorConfig = configByEnemyId?.[detector.id] ?? config

    if (!detectorConfig.enabled || !isValidConfig(detectorConfig)) {
      continue
    }

    const observedTime = currentTime - detectorConfig.delayTurns

    if (observedTime < 0) {
      continue
    }

    if (!observedPlayersByTime[observedTime]) {
      observedPlayersByTime[observedTime] = positionsAtTime(worldLine, observedTime)
    }

    const observedPlayers = observedPlayersByTime[observedTime]

    if (observedPlayers.length === 0) {
      continue
    }

    for (const observedPlayer of observedPlayers) {
      if (manhattanDistance(detector.position, observedPlayer.position) > detectorConfig.maxDistance) {
        continue
      }

      const lineOfSight = hasLineOfSight({
        cube,
        from: { x: detector.position.x, y: detector.position.y },
        to: { x: observedPlayer.position.x, y: observedPlayer.position.y },
        atTime: currentTime,
      })

      if (!lineOfSight) {
        continue
      }

      events.push({
        enemyId: detector.id,
        enemyPosition: detector.position,
        observedPlayer: observedPlayer.position,
        observedTurn: observedPlayer.turn,
      })
    }
  }

  return {
    detected: events.length > 0,
    atTime: currentTime,
    events,
  }
}
