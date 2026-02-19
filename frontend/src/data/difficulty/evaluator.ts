import { manhattanDistance } from '../../core/position'
import type {
  BehaviorDetectionProfile,
  ContentArchetype,
  ContentPack,
  DifficultyModelConfig,
  DifficultyTier,
  DifficultyTierBounds,
} from '../contracts'
import type { SolvabilitySearchOptions } from '../generation/solver'
import { evaluateSolvabilityV1 } from '../generation/solver'

/** Raw metrics used by the difficulty model before normalization. */
export interface DifficultyRawMetrics {
  shortestSolutionLength: number
  visitedNodes: number
  deadEndRatio: number
  requiredRiftCount: number
  requiredPushPullCount: number
  enemyExposureEvents: number
  paradoxFragilityCount: number
  timeDepth: number
}

/** Normalized major dimensions shown to users. */
export interface DifficultyVector {
  spatialPressure: number
  temporalPressure: number
  detectionPressure: number
  interactionComplexity: number
  paradoxRisk: number
}

/** Normalized model dimensions consumed by weighted score construction. */
export interface DifficultyDimensions {
  path: number
  branch: number
  temporal: number
  detection: number
  interaction: number
  paradox: number
}

export interface DifficultyEvaluation {
  modelVersion: string
  score: number
  tier: DifficultyTier
  vector: DifficultyVector
  dimensions: DifficultyDimensions
  metrics: DifficultyRawMetrics
  solver: ReturnType<typeof evaluateSolvabilityV1>
}

export interface DifficultyEvaluationOptions {
  solverOptions?: SolvabilitySearchOptions
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function normalize(raw: number, range: { min: number; max: number }): number {
  if (range.max === range.min) {
    return raw >= range.max ? 100 : 0
  }

  const ratio = (raw - range.min) / (range.max - range.min)
  return clamp(ratio * 100, 0, 100)
}

function weightedBlend(first: number, second: number, firstWeight: number, secondWeight: number): number {
  const total = firstWeight + secondWeight

  if (total <= 0) {
    return (first + second) / 2
  }

  return (first * firstWeight + second * secondWeight) / total
}

function hasComponent(archetype: ContentArchetype, kind: string): boolean {
  return archetype.components.some((component) => component.kind === kind)
}

function resolveDetectionProfile(pack: ContentPack, instanceId: string): BehaviorDetectionProfile {
  const assignedProfileKey =
    pack.behavior.detectionAssignments?.[instanceId] ?? pack.behavior.defaultDetectionProfile

  if (assignedProfileKey) {
    const profile = pack.behavior.detectionProfiles?.[assignedProfileKey]

    if (profile) {
      return profile
    }
  }

  return {
    enabled: pack.rules.detection.enabled,
    delayTurns: pack.rules.detection.delayTurns,
    maxDistance: pack.rules.detection.maxDistance,
  }
}

function resolvePathSpan(pack: ContentPack, instanceId: string): number {
  const policyKey = pack.behavior.assignments[instanceId]

  if (!policyKey) {
    return 1
  }

  const policy = pack.behavior.policies[policyKey]

  if (!policy) {
    return 1
  }

  switch (policy.kind) {
    case 'PatrolLoop':
    case 'PatrolPingPong':
      return Math.max(1, policy.path.length)
    case 'ScriptedTimeline':
      return Math.max(1, policy.points.length)
    case 'Static':
      return 1
  }
}

function estimateEnemyExposureEvents(pack: ContentPack): number {
  const start = pack.level.map.start
  let estimate = 0

  for (const instance of pack.level.instances) {
    const archetype = pack.level.archetypes[instance.archetype]

    if (!archetype) {
      continue
    }

    const isDetector = archetype.kind === 'enemy' || hasComponent(archetype, 'Patrol')

    if (!isDetector) {
      continue
    }

    const detection = resolveDetectionProfile(pack, instance.id)

    if (!detection.enabled || detection.maxDistance <= 0) {
      continue
    }

    const minDistance = manhattanDistance(start, instance.position)
    const span = resolvePathSpan(pack, instance.id)
    const pressure = Math.max(0, detection.maxDistance - minDistance + 1)

    estimate += pressure * span
  }

  return estimate
}

function estimateParadoxFragilityCount(pack: ContentPack): number {
  let risk = 0

  for (const instance of pack.level.instances) {
    const archetype = pack.level.archetypes[instance.archetype]

    if (!archetype) {
      continue
    }

    for (const component of archetype.components) {
      if (component.kind !== 'Rift') {
        continue
      }

      if (component.target.t < instance.position.t) {
        risk += 1
      }

      if (component.bidirectional) {
        risk += 1
      }
    }
  }

  return risk
}

function estimateRequiredRiftCount(pack: ContentPack): number {
  let count = 0

  for (const instance of pack.level.instances) {
    const archetype = pack.level.archetypes[instance.archetype]

    if (!archetype) {
      continue
    }

    for (const component of archetype.components) {
      if (component.kind === 'Rift' && component.target.t !== instance.position.t) {
        count += 1
      }
    }
  }

  return count
}

function estimateRequiredPushPullCount(pack: ContentPack): number {
  let count = 0

  for (const instance of pack.level.instances) {
    const archetype = pack.level.archetypes[instance.archetype]

    if (!archetype) {
      continue
    }

    if (hasComponent(archetype, 'Pushable') || hasComponent(archetype, 'Pullable')) {
      count += 1
    }
  }

  return count
}

export function suggestDifficultyTier(score: number, bounds: DifficultyTierBounds): DifficultyTier {
  if (score <= bounds.easy.max) {
    return 'easy'
  }

  if (score <= bounds.normal.max) {
    return 'normal'
  }

  if (score <= bounds.hard.max) {
    return 'hard'
  }

  return 'expert'
}

export function evaluateDifficultyV1(
  pack: ContentPack,
  model: DifficultyModelConfig,
  options: DifficultyEvaluationOptions = {},
): DifficultyEvaluation {
  const solver = evaluateSolvabilityV1(pack, options.solverOptions)

  const metrics: DifficultyRawMetrics = {
    shortestSolutionLength:
      solver.shortestPathLength ?? model.normalization.shortestSolutionLength.max,
    visitedNodes: solver.visitedNodes,
    deadEndRatio: solver.deadEndRatio,
    requiredRiftCount:
      solver.solved && solver.requiredRiftCount > 0
        ? solver.requiredRiftCount
        : estimateRequiredRiftCount(pack),
    requiredPushPullCount:
      solver.solved && solver.requiredPushPullCount > 0
        ? solver.requiredPushPullCount
        : estimateRequiredPushPullCount(pack),
    enemyExposureEvents: Math.max(solver.enemyExposureEvents, estimateEnemyExposureEvents(pack)),
    paradoxFragilityCount: estimateParadoxFragilityCount(pack),
    timeDepth: pack.level.map.timeDepth,
  }

  const path = normalize(metrics.shortestSolutionLength, model.normalization.shortestSolutionLength)
  const visitedNodes = normalize(metrics.visitedNodes, model.normalization.visitedNodes)
  const deadEndRatio = normalize(metrics.deadEndRatio, model.normalization.deadEndRatio)
  const requiredRiftCount = normalize(metrics.requiredRiftCount, model.normalization.requiredRiftCount)
  const timeDepth = normalize(metrics.timeDepth, model.normalization.timeDepth)
  const enemyExposureEvents = normalize(
    metrics.enemyExposureEvents,
    model.normalization.enemyExposureEvents,
  )
  const requiredPushPullCount = normalize(
    metrics.requiredPushPullCount,
    model.normalization.requiredPushPullCount,
  )
  const paradoxFragilityCount = normalize(
    metrics.paradoxFragilityCount,
    model.normalization.paradoxFragilityCount,
  )

  const branch = weightedBlend(
    visitedNodes,
    deadEndRatio,
    model.dimensionWeights.branchVisitedNodes,
    model.dimensionWeights.branchDeadEndRatio,
  )
  const temporal = weightedBlend(
    requiredRiftCount,
    timeDepth,
    model.dimensionWeights.temporalRiftCount,
    model.dimensionWeights.temporalTimeDepth,
  )

  const dimensions: DifficultyDimensions = {
    path: round2(path),
    branch: round2(branch),
    temporal: round2(temporal),
    detection: round2(enemyExposureEvents),
    interaction: round2(requiredPushPullCount),
    paradox: round2(paradoxFragilityCount),
  }

  const vector: DifficultyVector = {
    spatialPressure: round2((dimensions.path + dimensions.branch) / 2),
    temporalPressure: dimensions.temporal,
    detectionPressure: dimensions.detection,
    interactionComplexity: dimensions.interaction,
    paradoxRisk: dimensions.paradox,
  }

  const score = round2(
    clamp(
      dimensions.path * model.scoreWeights.path +
        dimensions.branch * model.scoreWeights.branch +
        dimensions.temporal * model.scoreWeights.temporal +
        dimensions.detection * model.scoreWeights.detection +
        dimensions.interaction * model.scoreWeights.interaction +
        dimensions.paradox * model.scoreWeights.paradox,
      0,
      100,
    ),
  )

  return {
    modelVersion: model.modelVersion,
    score,
    tier: suggestDifficultyTier(score, model.tierBounds),
    vector,
    dimensions,
    metrics,
    solver,
  }
}
