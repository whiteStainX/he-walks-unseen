import { hasComponent } from '../../core/components'
import { evaluateDetectionV1 } from '../../core/detection'
import { hasExit, objectsAt } from '../../core/timeCube'
import { createWorldLine, currentPosition } from '../../core/worldLine'
import { bootstrapLevelObjects } from '../../game/levelObjects'
import { executeRegisteredInteraction } from '../../game/interactions/registry'
import type { InteractionAction, InteractionState } from '../../game/interactions/types'
import {
  buildEnemyDetectionConfigByIdFromContent,
  buildLevelObjectsConfigFromContent,
  deriveRulesDetectionConfig,
} from '../contentAdapter'
import type { ContentPack } from '../contracts'
import type { SolvabilityReport } from './contracts'

export interface SolvabilitySearchOptions {
  maxDepth?: number
  maxNodes?: number
  includePushPull?: boolean
  includeRift?: boolean
}

function cloneState(state: InteractionState): InteractionState {
  return structuredClone(state)
}

function serializeState(state: InteractionState): string {
  const current = currentPosition(state.worldLine)

  if (!current) {
    return 'empty'
  }

  const objects = Object.entries(state.cube.objectsById)
    .map(([id, object]) => `${id}:${object.position.x},${object.position.y},${object.position.t}`)
    .sort()
    .join('|')

  return `${current.x},${current.y},${current.t}::${objects}`
}

function baseActions(
  includePush: boolean,
  includePull: boolean,
  includeRift: boolean,
): InteractionAction[] {
  const actions: InteractionAction[] = [
    { kind: 'Move', direction: 'north' },
    { kind: 'Move', direction: 'east' },
    { kind: 'Move', direction: 'south' },
    { kind: 'Move', direction: 'west' },
    { kind: 'Wait' },
  ]

  if (includePush) {
    actions.push(
      { kind: 'Push', direction: 'north' },
      { kind: 'Push', direction: 'east' },
      { kind: 'Push', direction: 'south' },
      { kind: 'Push', direction: 'west' },
    )
  }

  if (includePull) {
    actions.push(
      { kind: 'Pull', direction: 'north' },
      { kind: 'Pull', direction: 'east' },
      { kind: 'Pull', direction: 'south' },
      { kind: 'Pull', direction: 'west' },
    )
  }

  if (includeRift) {
    actions.push({ kind: 'ApplyRift' })
  }

  return actions
}

function tunnelActionsAtCurrent(state: InteractionState): InteractionAction[] {
  const current = currentPosition(state.worldLine)

  if (!current) {
    return []
  }

  const dedupe = new Set<string>()
  const actions: InteractionAction[] = []

  for (const object of objectsAt(state.cube, current)) {
    for (const component of object.archetype.components) {
      if (component.kind !== 'Rift') {
        continue
      }

      const key = `${component.target.x},${component.target.y},${component.target.t}`

      if (dedupe.has(key)) {
        continue
      }

      dedupe.add(key)
      actions.push({
        kind: 'ApplyRift',
        instruction: {
          kind: 'tunnel',
          target: component.target,
        },
      })
    }
  }

  return actions
}

function createInitialSolverState(pack: ContentPack): InteractionState | null {
  const objectsConfig = buildLevelObjectsConfigFromContent(pack)
  const bootstrapped = bootstrapLevelObjects(
    pack.level.map.width,
    pack.level.map.height,
    pack.level.map.timeDepth,
    objectsConfig,
  )

  if (!bootstrapped.ok) {
    return null
  }

  const detectionConfig = deriveRulesDetectionConfig(pack)

  return {
    boardWidth: pack.level.map.width,
    boardHeight: pack.level.map.height,
    timeDepth: pack.level.map.timeDepth,
    cube: bootstrapped.value.cube,
    worldLine: createWorldLine(pack.level.map.start),
    currentTime: pack.level.map.start.t,
    turn: 0,
    phase: 'Playing',
    riftSettings: {
      defaultDelta: pack.rules.rift.defaultDelta,
      baseEnergyCost: pack.rules.rift.baseEnergyCost,
    },
    riftResources: { energy: null },
    interactionConfig: {
      maxPushChain: pack.rules.interaction.maxPushChain,
      allowPull: pack.rules.interaction.allowPull,
    },
    history: [],
    detectionConfig,
    enemyDetectionConfigById: buildEnemyDetectionConfigByIdFromContent(pack),
    lastDetection: null,
    paradoxConfig: { enabled: false },
    lastParadox: null,
    causalAnchors: [],
    causalAnchorsByTime: {},
    status: 'solver',
  }
}

function isDetected(state: InteractionState): boolean {
  const current = currentPosition(state.worldLine)

  if (!current) {
    return true
  }

  const detection = evaluateDetectionV1({
    cube: state.cube,
    worldLine: state.worldLine,
    currentTime: current.t,
    config: state.detectionConfig,
    configByEnemyId: state.enemyDetectionConfigById,
  })

  return detection.detected
}

export function evaluateSolvabilityV1(
  pack: ContentPack,
  options: SolvabilitySearchOptions = {},
): SolvabilityReport {
  const initial = createInitialSolverState(pack)

  if (!initial) {
    return { solved: false, shortestPathLength: null, visitedNodes: 0 }
  }

  const maxDepth = Math.max(1, options.maxDepth ?? Math.min(48, pack.level.map.timeDepth * 2))
  const maxNodes = Math.max(128, options.maxNodes ?? 6000)
  const includePushPull = options.includePushPull ?? true
  const includeRift = options.includeRift ?? true
  const hasPushable = Object.values(initial.cube.objectsById).some((object) =>
    hasComponent(object.archetype.components, 'Pushable'),
  )
  const hasPullable =
    initial.interactionConfig.allowPull &&
    Object.values(initial.cube.objectsById).some((object) =>
      hasComponent(object.archetype.components, 'Pullable'),
    )
  const includePush = includePushPull && hasPushable
  const includePull = includePushPull && hasPullable
  const queue: Array<{ state: InteractionState; depth: number }> = [{ state: initial, depth: 0 }]
  const visited = new Set<string>([serializeState(initial)])
  let visitedNodes = 0

  for (let index = 0; index < queue.length && visitedNodes < maxNodes; index += 1) {
    const node = queue[index]
    const current = currentPosition(node.state.worldLine)

    if (!current) {
      continue
    }

    visitedNodes += 1

    if (hasExit(node.state.cube, current)) {
      return {
        solved: true,
        shortestPathLength: node.depth,
        visitedNodes,
      }
    }

    if (node.depth >= maxDepth) {
      continue
    }

    const actions = [
      ...baseActions(includePush, includePull, includeRift),
      ...(includeRift ? tunnelActionsAtCurrent(node.state) : []),
    ]

    for (const action of actions) {
      const next = cloneState(node.state)
      const result = executeRegisteredInteraction(next, action)

      if (!result.ok) {
        continue
      }

      const nextCurrent = currentPosition(next.worldLine)

      if (!nextCurrent) {
        continue
      }

      next.turn = node.state.turn + 1
      next.currentTime = nextCurrent.t

      if (isDetected(next)) {
        continue
      }

      const signature = serializeState(next)

      if (visited.has(signature)) {
        continue
      }

      visited.add(signature)
      queue.push({
        state: next,
        depth: node.depth + 1,
      })
    }
  }

  return {
    solved: false,
    shortestPathLength: null,
    visitedNodes,
  }
}
