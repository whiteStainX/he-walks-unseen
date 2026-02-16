import type { Position2D } from '../../core/position'
import type {
  BehaviorConfig,
  ContentArchetype,
  ContentInstance,
  ContentPack,
  GameRulesConfig,
  LevelConfig,
  ThemeConfig,
} from '../contracts'
import type {
  MapGenBudgets,
  MapGenDifficulty,
  MapGenFeatureFlags,
  MapGenRequest,
} from './contracts'
import type { SeededRng } from './random'
import { createSeededRng } from './random'

const DEFAULT_BUDGETS: Record<MapGenDifficulty, MapGenBudgets> = {
  easy: { maxWalls: 8, maxDynamicObjects: 1, maxEnemies: 1, maxRifts: 0 },
  normal: { maxWalls: 14, maxDynamicObjects: 2, maxEnemies: 2, maxRifts: 0 },
  hard: { maxWalls: 20, maxDynamicObjects: 3, maxEnemies: 3, maxRifts: 0 },
}

const DEFAULT_FEATURE_FLAGS: MapGenFeatureFlags = {
  allowPull: true,
  allowPushChains: true,
  allowFutureRifts: false,
}

function key(position: Position2D): string {
  return `${position.x},${position.y}`
}

function makeCell(x: number, y: number): Position2D {
  return { x, y }
}

function inBounds(position: Position2D, width: number, height: number): boolean {
  return position.x >= 0 && position.y >= 0 && position.x < width && position.y < height
}

function mergeBudgets(request: MapGenRequest): MapGenBudgets {
  const difficulty = request.difficulty ?? 'normal'
  return {
    ...DEFAULT_BUDGETS[difficulty],
    ...request.budgets,
  }
}

function mergeFeatureFlags(request: MapGenRequest): MapGenFeatureFlags {
  return {
    ...DEFAULT_FEATURE_FLAGS,
    ...request.featureFlags,
  }
}

function takeRandomCells(cells: Position2D[], count: number, rng: SeededRng): Position2D[] {
  const pool = [...cells]
  const selected: Position2D[] = []

  for (let index = 0; index < count; index += 1) {
    if (pool.length === 0) {
      break
    }

    const pickIndex = rng.nextInt(0, pool.length - 1)
    const [cell] = pool.splice(pickIndex, 1)
    selected.push(cell)
  }

  return selected
}

function createArchetypes(): Record<string, ContentArchetype> {
  return {
    wall: {
      kind: 'wall',
      components: [{ kind: 'BlocksMovement' }, { kind: 'BlocksVision' }, { kind: 'TimePersistent' }],
      render: { fill: '#f0f0f0', stroke: '#111111', symbol: 'wall' },
    },
    exit: {
      kind: 'exit',
      components: [{ kind: 'Exit' }, { kind: 'TimePersistent' }],
      render: { fill: '#ffffff', stroke: '#111111', symbol: 'exit' },
    },
    box: {
      kind: 'box',
      components: [
        { kind: 'BlocksMovement' },
        { kind: 'Pushable' },
        { kind: 'Pullable' },
        { kind: 'TimePersistent' },
      ],
      render: { fill: '#d9d9d9', stroke: '#111111', symbol: 'box' },
    },
    enemy: {
      kind: 'enemy',
      components: [{ kind: 'BlocksMovement' }, { kind: 'TimePersistent' }],
      render: { fill: '#c6c6c6', stroke: '#111111', symbol: 'enemy' },
    },
  }
}

function createTheme(request: MapGenRequest): ThemeConfig {
  return {
    schemaVersion: 1,
    id: request.themeId ?? 'generated-mono',
    iconPackId: request.iconPackId ?? 'default-mono',
    cssVars: {
      '--ink': '#111111',
      '--paper': '#ffffff',
      '--panel': '#ffffff',
      '--accent': '#111111',
      '--grid': '#111111',
      '--border': '#111111',
      '--muted': '#666666',
    },
  }
}

function createRules(request: MapGenRequest): GameRulesConfig {
  const difficulty = request.difficulty ?? 'normal'
  const features = mergeFeatureFlags(request)
  const detectionRange = difficulty === 'easy' ? 1 : difficulty === 'normal' ? 2 : 3

  return {
    schemaVersion: 1,
    rift: {
      defaultDelta: 3,
      baseEnergyCost: 0,
    },
    interaction: {
      maxPushChain: features.allowPushChains ? 4 : 1,
      allowPull: features.allowPull,
    },
    detection: {
      enabled: false,
      delayTurns: 1,
      maxDistance: detectionRange,
    },
  }
}

function buildGuaranteedPath(start: Position2D, exit: Position2D): Set<string> {
  const reserved = new Set<string>([key(start), key(exit)])

  for (let x = Math.min(start.x, exit.x); x <= Math.max(start.x, exit.x); x += 1) {
    reserved.add(key(makeCell(x, start.y)))
  }

  for (let y = Math.min(start.y, exit.y); y <= Math.max(start.y, exit.y); y += 1) {
    reserved.add(key(makeCell(exit.x, y)))
  }

  return reserved
}

function tryBuildPatrolPath(input: {
  spawn: Position2D
  width: number
  height: number
  blocked: Set<string>
  reservedPath: Set<string>
}): Position2D[] | null {
  const patterns: Position2D[][] = [
    [
      input.spawn,
      makeCell(input.spawn.x + 1, input.spawn.y),
      makeCell(input.spawn.x + 1, input.spawn.y + 1),
      makeCell(input.spawn.x, input.spawn.y + 1),
    ],
    [
      input.spawn,
      makeCell(input.spawn.x, input.spawn.y + 1),
      makeCell(input.spawn.x - 1, input.spawn.y + 1),
      makeCell(input.spawn.x - 1, input.spawn.y),
    ],
    [
      input.spawn,
      makeCell(input.spawn.x - 1, input.spawn.y),
      makeCell(input.spawn.x - 1, input.spawn.y - 1),
      makeCell(input.spawn.x, input.spawn.y - 1),
    ],
    [
      input.spawn,
      makeCell(input.spawn.x, input.spawn.y - 1),
      makeCell(input.spawn.x + 1, input.spawn.y - 1),
      makeCell(input.spawn.x + 1, input.spawn.y),
    ],
  ]

  for (const pattern of patterns) {
    const valid = pattern.every((cell) => {
      if (!inBounds(cell, input.width, input.height)) {
        return false
      }

      const cellKey = key(cell)
      return !input.blocked.has(cellKey) && !input.reservedPath.has(cellKey)
    })

    if (valid) {
      return pattern
    }
  }

  return null
}

export function generateCandidateContent(
  request: MapGenRequest,
  attempt: number,
): ContentPack {
  const difficulty = request.difficulty ?? 'normal'
  const budgets = mergeBudgets(request)
  const rng = createSeededRng(`${request.seed}:${attempt}`)
  const width = request.board.width
  const height = request.board.height
  const timeDepth = request.board.timeDepth
  const start = { x: 1, y: 1, t: 0 }
  const exit = { x: width - 2, y: height - 2, t: 0 }
  const reservedPath = buildGuaranteedPath(start, exit)
  const occupied = new Set<string>([key(start), key(exit)])
  const borderWalls: Position2D[] = []

  for (let x = 0; x < width; x += 1) {
    borderWalls.push(makeCell(x, 0))
    borderWalls.push(makeCell(x, height - 1))
  }

  for (let y = 1; y < height - 1; y += 1) {
    borderWalls.push(makeCell(0, y))
    borderWalls.push(makeCell(width - 1, y))
  }

  for (const borderWall of borderWalls) {
    occupied.add(key(borderWall))
  }

  const interiorCells: Position2D[] = []

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const cell = makeCell(x, y)
      const cellKey = key(cell)

      if (occupied.has(cellKey) || reservedPath.has(cellKey)) {
        continue
      }

      interiorCells.push(cell)
    }
  }

  const wallTarget =
    budgets.maxWalls > 0 ? rng.nextInt(Math.floor(budgets.maxWalls / 2), budgets.maxWalls) : 0
  const interiorWalls = takeRandomCells(interiorCells, wallTarget, rng)

  for (const wall of interiorWalls) {
    occupied.add(key(wall))
  }

  const postWallCells = interiorCells.filter((cell) => !occupied.has(key(cell)))
  const boxes = takeRandomCells(postWallCells, budgets.maxDynamicObjects, rng)

  for (const box of boxes) {
    occupied.add(key(box))
  }

  const postBoxCells = postWallCells.filter((cell) => !occupied.has(key(cell)))
  const enemies = takeRandomCells(postBoxCells, budgets.maxEnemies, rng)

  const archetypes = createArchetypes()
  const instances: ContentInstance[] = []
  let wallIndex = 0
  let boxIndex = 0
  let enemyIndex = 0

  for (const borderWall of borderWalls) {
    instances.push({
      id: `wall.border.${wallIndex}`,
      archetype: 'wall',
      position: { x: borderWall.x, y: borderWall.y, t: 0 },
    })
    wallIndex += 1
  }

  for (const wall of interiorWalls) {
    instances.push({
      id: `wall.inner.${wallIndex}`,
      archetype: 'wall',
      position: { x: wall.x, y: wall.y, t: 0 },
    })
    wallIndex += 1
  }

  instances.push({ id: 'exit.main', archetype: 'exit', position: exit })

  for (const box of boxes) {
    instances.push({
      id: `box.${boxIndex}`,
      archetype: 'box',
      position: { x: box.x, y: box.y, t: 0 },
    })
    boxIndex += 1
  }

  const behavior: BehaviorConfig = {
    schemaVersion: 1,
    policies: {},
    assignments: {},
  }

  for (const enemy of enemies) {
    const enemyId = `enemy.${enemyIndex}`
    instances.push({
      id: enemyId,
      archetype: 'enemy',
      position: { x: enemy.x, y: enemy.y, t: 0 },
    })

    const patrol = tryBuildPatrolPath({
      spawn: enemy,
      width,
      height,
      blocked: occupied,
      reservedPath,
    })
    const policyId = `enemy.policy.${enemyIndex}`

    if (patrol && patrol.length >= 2) {
      const loops = rng.nextFloat() < 0.5
      behavior.policies[policyId] = loops
        ? { kind: 'PatrolLoop', path: patrol }
        : { kind: 'PatrolPingPong', path: patrol }
    } else {
      behavior.policies[policyId] = { kind: 'Static' }
    }

    behavior.assignments[enemyId] = policyId
    enemyIndex += 1
  }

  if (enemyIndex > 0) {
    behavior.detectionProfiles = {
      default_watch: {
        enabled: true,
        delayTurns: 1,
        maxDistance: difficulty === 'hard' ? 3 : 2,
      },
    }
    behavior.defaultDetectionProfile = 'default_watch'
  }

  const level: LevelConfig = {
    schemaVersion: 1,
    meta: {
      id: request.packId ?? `generated-${request.seed}-${attempt}`,
      name: `Generated ${request.seed} #${attempt}`,
    },
    map: {
      width,
      height,
      timeDepth,
      start,
    },
    archetypes,
    instances,
  }

  return {
    level,
    behavior,
    theme: createTheme(request),
    rules: createRules(request),
  }
}
