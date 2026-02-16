import { hasComponent } from './components'
import type { ResolvedObjectInstance } from './objects'
import { manhattanDistance, type Position3D } from './position'
import { objectsAtTime, type TimeCube } from './timeCube'
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
      if (manhattanDistance(detector.position, observedPlayer.position) <= detectorConfig.maxDistance) {
        events.push({
          enemyId: detector.id,
          enemyPosition: detector.position,
          observedPlayer: observedPlayer.position,
          observedTurn: observedPlayer.turn,
        })
      }
    }
  }

  return {
    detected: events.length > 0,
    atTime: currentTime,
    events,
  }
}
