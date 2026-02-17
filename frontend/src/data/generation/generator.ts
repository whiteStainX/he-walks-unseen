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
  GenerationDifficultyProfile,
  GenerationProfile,
  MapGenBudgets,
  MapGenDifficulty,
  MapGenFeatureFlags,
  MapGenRequest,
  PatrolBehaviorStrategy,
  PatrolPathOrderStrategy,
  WallTargetStrategy,
} from './contracts'
import type { SeededRng } from './random'
import { createSeededRng } from './random'

function key(position: Position2D): string {
  return `${position.x},${position.y}`
}

function makeCell(x: number, y: number): Position2D {
  return { x, y }
}

function inBounds(position: Position2D, width: number, height: number): boolean {
  return position.x >= 0 && position.y >= 0 && position.x < width && position.y < height
}

function clamp01(value: number): number {
  if (value < 0) {
    return 0
  }

  if (value > 1) {
    return 1
  }

  return value
}

function manhattan2D(a: Position2D, b: Position2D): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function fitExitToTimeBudget(input: {
  start: Position2D
  preferredExit: Position2D
  minX: number
  minY: number
  maxX: number
  maxY: number
  maxSteps: number
}): Position2D {
  const exit = { ...input.preferredExit }

  while (manhattan2D(input.start, exit) > input.maxSteps) {
    const dx = exit.x - input.start.x
    const dy = exit.y - input.start.y

    if (Math.abs(dx) >= Math.abs(dy) && exit.x > input.minX) {
      exit.x -= Math.sign(dx)
      continue
    }

    if (exit.y > input.minY) {
      exit.y -= Math.sign(dy)
      continue
    }

    if (exit.x < input.maxX) {
      exit.x += 1
      continue
    }

    if (exit.y < input.maxY) {
      exit.y += 1
      continue
    }

    break
  }

  return exit
}

function resolveDifficulty(request: MapGenRequest, profile: GenerationProfile): MapGenDifficulty {
  return request.difficulty ?? profile.defaultDifficulty
}

function mergeBudgets(
  request: MapGenRequest,
  difficultyProfile: GenerationDifficultyProfile,
): MapGenBudgets {
  return {
    ...difficultyProfile.budgets,
    ...request.budgets,
  }
}

function mergeFeatureFlags(request: MapGenRequest, profile: GenerationProfile): MapGenFeatureFlags {
  return {
    ...profile.defaultFeatureFlags,
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

function shuffleList<T>(items: T[], rng: SeededRng): T[] {
  const output = [...items]

  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.nextInt(0, index)
    const current = output[index]
    output[index] = output[swapIndex]
    output[swapIndex] = current
  }

  return output
}

function resolveWallTarget(input: {
  maxWalls: number
  minWallRatio: number
  rng: SeededRng
  strategy: WallTargetStrategy
}): number {
  const minWallTarget = Math.min(input.maxWalls, Math.floor(input.maxWalls * clamp01(input.minWallRatio)))

  if (input.maxWalls <= 0) {
    return 0
  }

  if (input.strategy === 'maxBudget') {
    return input.maxWalls
  }

  return input.rng.nextInt(minWallTarget, input.maxWalls)
}

function resolvePatrolLoops(strategy: PatrolBehaviorStrategy, rng: SeededRng): boolean | null {
  if (strategy === 'loop') {
    return true
  }

  if (strategy === 'pingpong') {
    return false
  }

  if (strategy === 'mixed') {
    return rng.nextFloat() < 0.5
  }

  return null
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

function createTheme(request: MapGenRequest, profile: GenerationProfile): ThemeConfig {
  return {
    schemaVersion: 1,
    id: request.themeId ?? profile.theme.id,
    iconPackId: request.iconPackId ?? profile.theme.iconPackId,
    cssVars: profile.theme.cssVars,
  }
}

function createRules(
  profile: GenerationProfile,
  difficultyProfile: GenerationDifficultyProfile,
  featureFlags: MapGenFeatureFlags,
): GameRulesConfig {
  return {
    schemaVersion: 1,
    rift: {
      defaultDelta: profile.rift.defaultDelta,
      baseEnergyCost: profile.rift.baseEnergyCost,
    },
    interaction: {
      maxPushChain: featureFlags.allowPushChains
        ? profile.interaction.maxPushChainWhenEnabled
        : profile.interaction.maxPushChainWhenDisabled,
      allowPull: featureFlags.allowPull,
    },
    detection: {
      enabled: profile.detection.enabled,
      delayTurns: profile.detection.delayTurns,
      maxDistance: difficultyProfile.detectionRange,
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
  rng: SeededRng
  patrolPathOrder: PatrolPathOrderStrategy
}): Position2D[] | null {
  const basePatterns: Position2D[][] = [
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

  const patterns =
    input.patrolPathOrder === 'shuffled'
      ? shuffleList(basePatterns, input.rng)
      : basePatterns

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

export function generateCandidateContent(input: {
  request: MapGenRequest
  profile: GenerationProfile
  attempt: number
}): ContentPack {
  const { request, profile, attempt } = input
  const difficulty = resolveDifficulty(request, profile)
  const difficultyProfile = profile.difficultyProfiles[difficulty]
  const budgets = mergeBudgets(request, difficultyProfile)
  const featureFlags = mergeFeatureFlags(request, profile)
  const rng = createSeededRng(`${request.seed}:${attempt}`)
  const width = request.board.width
  const height = request.board.height
  const timeDepth = request.board.timeDepth
  const startCell = { x: profile.startInset, y: profile.startInset }
  const preferredExit = { x: width - 1 - profile.exitInset, y: height - 1 - profile.exitInset }
  const adjustedExit = fitExitToTimeBudget({
    start: startCell,
    preferredExit,
    minX: profile.startInset,
    minY: profile.startInset,
    maxX: width - 1 - profile.exitInset,
    maxY: height - 1 - profile.exitInset,
    maxSteps: Math.max(1, timeDepth - 2),
  })
  const start = { x: startCell.x, y: startCell.y, t: 0 }
  const exit = { x: adjustedExit.x, y: adjustedExit.y, t: 0 }
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

  const wallTarget = resolveWallTarget({
    maxWalls: budgets.maxWalls,
    minWallRatio: difficultyProfile.minWallRatio,
    rng,
    strategy: profile.strategies.wallTarget,
  })
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

  for (const enemy of enemies) {
    occupied.add(key(enemy))
  }

  const postEnemyCells = postBoxCells.filter((cell) => !occupied.has(key(cell)))
  const requestedRifts = Math.max(0, budgets.maxRifts)
  const riftAnchorCount = requestedRifts >= 2 ? requestedRifts - (requestedRifts % 2) : 0
  const riftCells = takeRandomCells(postEnemyCells, riftAnchorCount, rng)

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
      rng,
      patrolPathOrder: profile.strategies.patrolPathOrder,
    })
    const policyId = `enemy.policy.${enemyIndex}`
    const patrolLoops = resolvePatrolLoops(profile.strategies.patrolBehavior, rng)

    if (patrol && patrol.length >= 2 && patrolLoops !== null) {
      behavior.policies[policyId] = patrolLoops
        ? { kind: 'PatrolLoop', path: patrol }
        : { kind: 'PatrolPingPong', path: patrol }
    } else {
      behavior.policies[policyId] = { kind: 'Static' }
    }

    behavior.assignments[enemyId] = policyId
    enemyIndex += 1
  }

  for (let index = 0; index + 1 < riftCells.length; index += 2) {
    const sourceA = riftCells[index]
    const sourceB = riftCells[index + 1]
    const archetypeA = `rift.gen.${index / 2}.a`
    const archetypeB = `rift.gen.${index / 2}.b`

    archetypes[archetypeA] = {
      kind: 'rift',
      components: [
        { kind: 'TimePersistent' },
        {
          kind: 'Rift',
          target: { x: sourceB.x, y: sourceB.y, t: 0 },
          bidirectional: true,
        },
      ],
      render: { fill: '#ffffff', stroke: '#111111', symbol: 'rift' },
    }
    archetypes[archetypeB] = {
      kind: 'rift',
      components: [
        { kind: 'TimePersistent' },
        {
          kind: 'Rift',
          target: { x: sourceA.x, y: sourceA.y, t: 0 },
          bidirectional: true,
        },
      ],
      render: { fill: '#ffffff', stroke: '#111111', symbol: 'rift' },
    }

    instances.push({
      id: `rift.${index / 2}.a`,
      archetype: archetypeA,
      position: { x: sourceA.x, y: sourceA.y, t: 0 },
    })
    instances.push({
      id: `rift.${index / 2}.b`,
      archetype: archetypeB,
      position: { x: sourceB.x, y: sourceB.y, t: 0 },
    })
  }

  if (enemyIndex > 0) {
    behavior.detectionProfiles = {
      default_watch: {
        enabled: true,
        delayTurns: profile.detection.delayTurns,
        maxDistance: difficultyProfile.detectionRange,
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
    theme: createTheme(request, profile),
    rules: createRules(profile, difficultyProfile, featureFlags),
  }
}
