import { isInBounds, type Position2D, type Position3D } from '../core/position'
import type { Result } from '../core/result'
import type {
  BehaviorConfig,
  ContentLoadError,
  ContentPack,
  DifficultyDimensionWeights,
  DifficultyModelConfig,
  DifficultyModelConfigError,
  DifficultyNormalizationConfig,
  DifficultyRange,
  DifficultyScoreWeights,
  DifficultyTierBounds,
  GameRulesConfig,
  IconPackConfig,
  LevelConfig,
  ThemeConfig,
} from './contracts'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

function parseLevelConfig(input: unknown): Result<LevelConfig, ContentLoadError> {
  if (!isObject(input)) {
    return { ok: false, error: { kind: 'InvalidShape', file: 'level', message: 'Expected object' } }
  }

  if (input.schemaVersion !== 1) {
    return {
      ok: false,
      error: {
        kind: 'InvalidSchemaVersion',
        file: 'level',
        expected: 1,
        actual: input.schemaVersion,
      },
    }
  }

  return { ok: true, value: input as unknown as LevelConfig }
}

function parseBehaviorConfig(input: unknown): Result<BehaviorConfig, ContentLoadError> {
  if (!isObject(input)) {
    return {
      ok: false,
      error: { kind: 'InvalidShape', file: 'behavior', message: 'Expected object' },
    }
  }

  if (input.schemaVersion !== 1) {
    return {
      ok: false,
      error: {
        kind: 'InvalidSchemaVersion',
        file: 'behavior',
        expected: 1,
        actual: input.schemaVersion,
      },
    }
  }

  return { ok: true, value: input as unknown as BehaviorConfig }
}

function parseThemeConfig(input: unknown): Result<ThemeConfig, ContentLoadError> {
  if (!isObject(input)) {
    return {
      ok: false,
      error: { kind: 'InvalidShape', file: 'theme', message: 'Expected object' },
    }
  }

  if (input.schemaVersion !== 1) {
    return {
      ok: false,
      error: {
        kind: 'InvalidSchemaVersion',
        file: 'theme',
        expected: 1,
        actual: input.schemaVersion,
      },
    }
  }

  if (typeof input.id !== 'string' || input.id.length === 0) {
    return {
      ok: false,
      error: { kind: 'InvalidShape', file: 'theme', message: 'Theme id must be a non-empty string' },
    }
  }

  if (typeof input.iconPackId !== 'string' || input.iconPackId.length === 0) {
    return {
      ok: false,
      error: { kind: 'MissingIconPackId', themeId: input.id },
    }
  }

  return { ok: true, value: input as unknown as ThemeConfig }
}

function parseRulesConfig(input: unknown): Result<GameRulesConfig, ContentLoadError> {
  if (!isObject(input)) {
    return {
      ok: false,
      error: { kind: 'InvalidShape', file: 'rules', message: 'Expected object' },
    }
  }

  if (input.schemaVersion !== 1) {
    return {
      ok: false,
      error: {
        kind: 'InvalidSchemaVersion',
        file: 'rules',
        expected: 1,
        actual: input.schemaVersion,
      },
    }
  }

  return { ok: true, value: input as unknown as GameRulesConfig }
}

function validateMap(level: LevelConfig): Result<LevelConfig, ContentLoadError> {
  const { width, height, timeDepth, start } = level.map

  if (width <= 0 || height <= 0 || timeDepth <= 0) {
    return {
      ok: false,
      error: {
        kind: 'InvalidMapBounds',
        width,
        height,
        timeDepth,
      },
    }
  }

  const isStartValid =
    start.t >= 0 &&
    start.t < timeDepth &&
    isInBounds({ x: start.x, y: start.y }, width, height)

  if (!isStartValid) {
    return {
      ok: false,
      error: {
        kind: 'InvalidStartPosition',
        start,
      },
    }
  }

  return { ok: true, value: level }
}

function isPositionInLevel(level: LevelConfig, position: Position3D): boolean {
  return (
    position.t >= 0 &&
    position.t < level.map.timeDepth &&
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < level.map.width &&
    position.y < level.map.height
  )
}

function isPosition2DInLevel(level: LevelConfig, position: Position2D): boolean {
  return (
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < level.map.width &&
    position.y < level.map.height
  )
}

function validateBehaviorPolicyPoints(
  level: LevelConfig,
  behavior: BehaviorConfig,
): Result<null, ContentLoadError> {
  for (const [key, policy] of Object.entries(behavior.policies)) {
    switch (policy.kind) {
      case 'Static':
        break
      case 'PatrolLoop':
      case 'PatrolPingPong': {
        for (const point of policy.path) {
          if (!isPosition2DInLevel(level, point)) {
            return {
              ok: false,
              error: {
                kind: 'InvalidBehaviorPathPoint',
                key,
                point,
              },
            }
          }
        }
        break
      }
      case 'ScriptedTimeline': {
        for (const point of policy.points) {
          if (!isPositionInLevel(level, point)) {
            return {
              ok: false,
              error: {
                kind: 'InvalidBehaviorPathPoint',
                key,
                point,
              },
            }
          }
        }
      }
    }
  }

  return { ok: true, value: null }
}

function validateDetectionProfiles(
  behavior: BehaviorConfig,
  instanceIds: Set<string>,
): Result<null, ContentLoadError> {
  const profiles = behavior.detectionProfiles
  const assignments = behavior.detectionAssignments

  if (!profiles) {
    if (assignments && Object.keys(assignments).length > 0) {
      const [instanceId, profile] = Object.entries(assignments)[0]
      return {
        ok: false,
        error: {
          kind: 'UnknownDetectionProfileReference',
          instanceId,
          profile,
        },
      }
    }

    if (behavior.defaultDetectionProfile) {
      return {
        ok: false,
        error: {
          kind: 'InvalidDetectionProfile',
          key: behavior.defaultDetectionProfile,
          message: 'defaultDetectionProfile requires detectionProfiles',
        },
      }
    }

    return { ok: true, value: null }
  }

  for (const [key, profile] of Object.entries(profiles)) {
    if (
      typeof profile.enabled !== 'boolean' ||
      !Number.isInteger(profile.delayTurns) ||
      profile.delayTurns < 1 ||
      typeof profile.maxDistance !== 'number' ||
      profile.maxDistance < 0
    ) {
      return {
        ok: false,
        error: {
          kind: 'InvalidDetectionProfile',
          key,
          message: 'expected { enabled:boolean, delayTurns:int>=1, maxDistance:number>=0 }',
        },
      }
    }
  }

  if (
    behavior.defaultDetectionProfile &&
    profiles[behavior.defaultDetectionProfile] === undefined
  ) {
    return {
      ok: false,
      error: {
        kind: 'UnknownDetectionProfileReference',
        instanceId: 'default',
        profile: behavior.defaultDetectionProfile,
      },
    }
  }

  if (!assignments) {
    return { ok: true, value: null }
  }

  for (const [instanceId, profileKey] of Object.entries(assignments)) {
    if (!instanceIds.has(instanceId)) {
      return {
        ok: false,
        error: {
          kind: 'UnknownBehaviorAssignmentInstance',
          instanceId,
        },
      }
    }

    if (!profiles[profileKey]) {
      return {
        ok: false,
        error: {
          kind: 'UnknownDetectionProfileReference',
          instanceId,
          profile: profileKey,
        },
      }
    }
  }

  return { ok: true, value: null }
}

function validateArchetypeAndInstanceRefs(
  level: LevelConfig,
  behavior: BehaviorConfig,
): Result<null, ContentLoadError> {
  const instanceIds = new Set(level.instances.map((instance) => instance.id))
  const riftBySource = new Map<string, string>()

  for (const instance of level.instances) {
    if (!level.archetypes[instance.archetype]) {
      return {
        ok: false,
        error: {
          kind: 'UnknownArchetypeReference',
          instanceId: instance.id,
          archetype: instance.archetype,
        },
      }
    }

    if (!isPositionInLevel(level, instance.position)) {
      return {
        ok: false,
        error: {
          kind: 'InvalidShape',
          file: 'level',
          message: `Instance ${instance.id} position out of bounds`,
        },
      }
    }

    const archetype = level.archetypes[instance.archetype]
    const riftComponents = archetype.components.filter(
      (
        component,
      ): component is { kind: 'Rift'; target: Position3D; bidirectional: boolean } =>
        component.kind === 'Rift',
    )

    if (riftComponents.length === 0) {
      continue
    }

    const sourceKey = `${instance.position.x},${instance.position.y},${instance.position.t}`

    for (const component of riftComponents) {
      if (!isPositionInLevel(level, component.target)) {
        return {
          ok: false,
          error: {
            kind: 'InvalidRiftTarget',
            archetype: instance.archetype,
            target: component.target,
          },
        }
      }

      const targetSignature = `${component.target.x},${component.target.y},${component.target.t},${component.bidirectional ? 'b' : 'u'}`
      const existing = riftBySource.get(sourceKey)

      if (existing && existing !== targetSignature) {
        return {
          ok: false,
          error: {
            kind: 'ConflictingRiftSource',
            source: instance.position,
            archetype: instance.archetype,
          },
        }
      }

      riftBySource.set(sourceKey, targetSignature)
    }
  }

  for (const [instanceId, behaviorKey] of Object.entries(behavior.assignments)) {
    if (!instanceIds.has(instanceId)) {
      return {
        ok: false,
        error: {
          kind: 'UnknownBehaviorAssignmentInstance',
          instanceId,
        },
      }
    }

    const policy = behavior.policies[behaviorKey]

    if (!policy) {
      return {
        ok: false,
        error: {
          kind: 'UnknownBehaviorReference',
          instanceId,
          behavior: behaviorKey,
        },
      }
    }

    if (policy.kind === 'ScriptedTimeline') {
      return {
        ok: false,
        error: {
          kind: 'UnsupportedBehaviorPolicy',
          key: behaviorKey,
          policyKind: policy.kind,
        },
      }
    }
  }

  const pathValidation = validateBehaviorPolicyPoints(level, behavior)

  if (!pathValidation.ok) {
    return pathValidation
  }

  const detectionValidation = validateDetectionProfiles(behavior, instanceIds)

  if (!detectionValidation.ok) {
    return detectionValidation
  }

  return { ok: true, value: null }
}

function validateArchetypeRenderSymbols(level: LevelConfig): Result<null, ContentLoadError> {
  for (const [key, archetype] of Object.entries(level.archetypes)) {
    const symbol = archetype.render.symbol

    if (symbol !== undefined && (typeof symbol !== 'string' || symbol.length === 0)) {
      return {
        ok: false,
        error: {
          kind: 'InvalidShape',
          file: 'level',
          message: `Archetype ${key} render.symbol must be a non-empty string`,
        },
      }
    }
  }

  return { ok: true, value: null }
}

export function validateContentPack(input: {
  level: unknown
  behavior: unknown
  theme: unknown
  rules: unknown
}): Result<ContentPack, ContentLoadError> {
  const level = parseLevelConfig(input.level)

  if (!level.ok) {
    return level
  }

  const behavior = parseBehaviorConfig(input.behavior)

  if (!behavior.ok) {
    return behavior
  }

  const theme = parseThemeConfig(input.theme)

  if (!theme.ok) {
    return theme
  }

  const rules = parseRulesConfig(input.rules)

  if (!rules.ok) {
    return rules
  }

  const mapValidation = validateMap(level.value)

  if (!mapValidation.ok) {
    return mapValidation
  }

  const refValidation = validateArchetypeAndInstanceRefs(level.value, behavior.value)

  if (!refValidation.ok) {
    return refValidation
  }

  const symbolValidation = validateArchetypeRenderSymbols(level.value)

  if (!symbolValidation.ok) {
    return symbolValidation
  }

  return {
    ok: true,
    value: {
      level: level.value,
      behavior: behavior.value,
      theme: theme.value,
      rules: rules.value,
    },
  }
}

export function validateIconPackConfig(input: unknown): Result<IconPackConfig, ContentLoadError> {
  if (!isObject(input)) {
    return { ok: false, error: { kind: 'InvalidShape', file: 'icon-pack', message: 'Expected object' } }
  }

  if (input.schemaVersion !== 1) {
    return {
      ok: false,
      error: {
        kind: 'InvalidSchemaVersion',
        file: 'icon-pack',
        expected: 1,
        actual: input.schemaVersion,
      },
    }
  }

  if (typeof input.id !== 'string' || input.id.length === 0) {
    return {
      ok: false,
      error: { kind: 'InvalidShape', file: 'icon-pack', message: 'id must be a non-empty string' },
    }
  }

  if (!isObject(input.slots)) {
    return {
      ok: false,
      error: { kind: 'InvalidShape', file: 'icon-pack', message: 'slots must be an object' },
    }
  }

  const slotEntries = Object.entries(input.slots)

  if (slotEntries.length === 0) {
    return {
      ok: false,
      error: { kind: 'InvalidShape', file: 'icon-pack', message: 'slots must not be empty' },
    }
  }

  for (const [slot, value] of slotEntries) {
    if (!isObject(value)) {
      return {
        ok: false,
        error: { kind: 'InvalidShape', file: 'icon-pack', message: `Slot ${slot} must be an object` },
      }
    }

    if (typeof value.svg !== 'string' || value.svg.length === 0) {
      return {
        ok: false,
        error: {
          kind: 'InvalidShape',
          file: 'icon-pack',
          message: `Slot ${slot} must include non-empty svg path`,
        },
      }
    }

    if (value.png !== undefined && (typeof value.png !== 'string' || value.png.length === 0)) {
      return {
        ok: false,
        error: {
          kind: 'InvalidShape',
          file: 'icon-pack',
          message: `Slot ${slot} png must be a non-empty string when provided`,
        },
      }
    }
  }

  return { ok: true, value: input as unknown as IconPackConfig }
}

export function validateLevelSymbolSlots(
  level: LevelConfig,
  iconPack: IconPackConfig,
): Result<null, ContentLoadError> {
  const knownSlots = new Set(Object.keys(iconPack.slots))

  for (const archetype of Object.values(level.archetypes)) {
    const symbol = archetype.render.symbol

    if (typeof symbol !== 'string') {
      continue
    }

    if (!knownSlots.has(symbol)) {
      return {
        ok: false,
        error: {
          kind: 'InvalidIconSlotReference',
          archetype: archetype.kind,
          symbol,
        },
      }
    }
  }

  return { ok: true, value: null }
}

function validateDifficultyRange(
  input: unknown,
  path: string,
): Result<DifficultyRange, DifficultyModelConfigError> {
  if (!isObject(input)) {
    return {
      ok: false,
      error: { kind: 'InvalidDifficultyModel', path, message: 'expected object' },
    }
  }

  if (!isFiniteNumber(input.min) || !isFiniteNumber(input.max)) {
    return {
      ok: false,
      error: { kind: 'InvalidDifficultyModel', path, message: 'min and max must be finite numbers' },
    }
  }

  if (input.min > input.max) {
    return {
      ok: false,
      error: { kind: 'InvalidDifficultyModel', path, message: 'min must be <= max' },
    }
  }

  return {
    ok: true,
    value: {
      min: input.min,
      max: input.max,
    },
  }
}

function validateNormalizationConfig(
  input: unknown,
): Result<DifficultyNormalizationConfig, DifficultyModelConfigError> {
  if (!isObject(input)) {
    return {
      ok: false,
      error: { kind: 'InvalidDifficultyModel', path: 'normalization', message: 'expected object' },
    }
  }

  const shortestSolutionLength = validateDifficultyRange(
    input.shortestSolutionLength,
    'normalization.shortestSolutionLength',
  )
  if (!shortestSolutionLength.ok) {
    return shortestSolutionLength
  }

  const visitedNodes = validateDifficultyRange(
    input.visitedNodes,
    'normalization.visitedNodes',
  )
  if (!visitedNodes.ok) {
    return visitedNodes
  }

  const deadEndRatio = validateDifficultyRange(
    input.deadEndRatio,
    'normalization.deadEndRatio',
  )
  if (!deadEndRatio.ok) {
    return deadEndRatio
  }

  const requiredRiftCount = validateDifficultyRange(
    input.requiredRiftCount,
    'normalization.requiredRiftCount',
  )
  if (!requiredRiftCount.ok) {
    return requiredRiftCount
  }

  const requiredPushPullCount = validateDifficultyRange(
    input.requiredPushPullCount,
    'normalization.requiredPushPullCount',
  )
  if (!requiredPushPullCount.ok) {
    return requiredPushPullCount
  }

  const enemyExposureEvents = validateDifficultyRange(
    input.enemyExposureEvents,
    'normalization.enemyExposureEvents',
  )
  if (!enemyExposureEvents.ok) {
    return enemyExposureEvents
  }

  const paradoxFragilityCount = validateDifficultyRange(
    input.paradoxFragilityCount,
    'normalization.paradoxFragilityCount',
  )
  if (!paradoxFragilityCount.ok) {
    return paradoxFragilityCount
  }

  const timeDepth = validateDifficultyRange(input.timeDepth, 'normalization.timeDepth')
  if (!timeDepth.ok) {
    return timeDepth
  }

  return {
    ok: true,
    value: {
      shortestSolutionLength: shortestSolutionLength.value,
      visitedNodes: visitedNodes.value,
      deadEndRatio: deadEndRatio.value,
      requiredRiftCount: requiredRiftCount.value,
      requiredPushPullCount: requiredPushPullCount.value,
      enemyExposureEvents: enemyExposureEvents.value,
      paradoxFragilityCount: paradoxFragilityCount.value,
      timeDepth: timeDepth.value,
    },
  }
}

function validateScoreWeights(
  input: unknown,
): Result<DifficultyScoreWeights, DifficultyModelConfigError> {
  if (!isObject(input)) {
    return {
      ok: false,
      error: { kind: 'InvalidDifficultyModel', path: 'scoreWeights', message: 'expected object' },
    }
  }

  const pathWeight = input.path
  const branchWeight = input.branch
  const temporalWeight = input.temporal
  const detectionWeight = input.detection
  const interactionWeight = input.interaction
  const paradoxWeight = input.paradox

  if (!isFiniteNumber(pathWeight) || pathWeight < 0) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'scoreWeights.path',
        message: 'must be a number >= 0',
      },
    }
  }

  if (!isFiniteNumber(branchWeight) || branchWeight < 0) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'scoreWeights.branch',
        message: 'must be a number >= 0',
      },
    }
  }

  if (!isFiniteNumber(temporalWeight) || temporalWeight < 0) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'scoreWeights.temporal',
        message: 'must be a number >= 0',
      },
    }
  }

  if (!isFiniteNumber(detectionWeight) || detectionWeight < 0) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'scoreWeights.detection',
        message: 'must be a number >= 0',
      },
    }
  }

  if (!isFiniteNumber(interactionWeight) || interactionWeight < 0) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'scoreWeights.interaction',
        message: 'must be a number >= 0',
      },
    }
  }

  if (!isFiniteNumber(paradoxWeight) || paradoxWeight < 0) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'scoreWeights.paradox',
        message: 'must be a number >= 0',
      },
    }
  }

  const sum =
    pathWeight +
    branchWeight +
    temporalWeight +
    detectionWeight +
    interactionWeight +
    paradoxWeight

  if (Math.abs(sum - 1) > 1e-6) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'scoreWeights',
        message: 'weights must sum to 1',
      },
    }
  }

  return {
    ok: true,
    value: {
      path: pathWeight,
      branch: branchWeight,
      temporal: temporalWeight,
      detection: detectionWeight,
      interaction: interactionWeight,
      paradox: paradoxWeight,
    },
  }
}

function validateDimensionWeights(
  input: unknown,
): Result<DifficultyDimensionWeights, DifficultyModelConfigError> {
  if (!isObject(input)) {
    return {
      ok: false,
      error: { kind: 'InvalidDifficultyModel', path: 'dimensionWeights', message: 'expected object' },
    }
  }

  const branchVisitedNodes = input.branchVisitedNodes
  const branchDeadEndRatio = input.branchDeadEndRatio
  const temporalRiftCount = input.temporalRiftCount
  const temporalTimeDepth = input.temporalTimeDepth

  if (!isFiniteNumber(branchVisitedNodes) || branchVisitedNodes < 0) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'dimensionWeights.branchVisitedNodes',
        message: 'must be a number >= 0',
      },
    }
  }

  if (!isFiniteNumber(branchDeadEndRatio) || branchDeadEndRatio < 0) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'dimensionWeights.branchDeadEndRatio',
        message: 'must be a number >= 0',
      },
    }
  }

  if (!isFiniteNumber(temporalRiftCount) || temporalRiftCount < 0) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'dimensionWeights.temporalRiftCount',
        message: 'must be a number >= 0',
      },
    }
  }

  if (!isFiniteNumber(temporalTimeDepth) || temporalTimeDepth < 0) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'dimensionWeights.temporalTimeDepth',
        message: 'must be a number >= 0',
      },
    }
  }

  if (branchVisitedNodes + branchDeadEndRatio <= 0) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'dimensionWeights',
        message: 'branch weights must include at least one positive value',
      },
    }
  }

  if (temporalRiftCount + temporalTimeDepth <= 0) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'dimensionWeights',
        message: 'temporal weights must include at least one positive value',
      },
    }
  }

  return {
    ok: true,
    value: {
      branchVisitedNodes,
      branchDeadEndRatio,
      temporalRiftCount,
      temporalTimeDepth,
    },
  }
}

function validateTierBounds(input: unknown): Result<DifficultyTierBounds, DifficultyModelConfigError> {
  if (!isObject(input)) {
    return {
      ok: false,
      error: { kind: 'InvalidDifficultyModel', path: 'tierBounds', message: 'expected object' },
    }
  }

  const easy = validateDifficultyRange(input.easy, 'tierBounds.easy')
  if (!easy.ok) {
    return easy
  }
  const normal = validateDifficultyRange(input.normal, 'tierBounds.normal')
  if (!normal.ok) {
    return normal
  }
  const hard = validateDifficultyRange(input.hard, 'tierBounds.hard')
  if (!hard.ok) {
    return hard
  }
  const expert = validateDifficultyRange(input.expert, 'tierBounds.expert')
  if (!expert.ok) {
    return expert
  }

  if (easy.value.min !== 0 || expert.value.max !== 100) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'tierBounds',
        message: 'tier bounds must start at 0 and end at 100',
      },
    }
  }

  if (
    easy.value.max >= normal.value.min ||
    normal.value.max >= hard.value.min ||
    hard.value.max >= expert.value.min
  ) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'tierBounds',
        message: 'tier bounds must be strictly increasing without overlap',
      },
    }
  }

  return {
    ok: true,
    value: {
      easy: easy.value,
      normal: normal.value,
      hard: hard.value,
      expert: expert.value,
    },
  }
}

export function validateDifficultyModelConfig(
  input: unknown,
): Result<DifficultyModelConfig, DifficultyModelConfigError> {
  if (!isObject(input)) {
    return {
      ok: false,
      error: { kind: 'InvalidDifficultyModel', path: 'root', message: 'expected object' },
    }
  }

  if (input.schemaVersion !== 1) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModelVersion',
        expected: 1,
        actual: input.schemaVersion,
      },
    }
  }

  if (typeof input.modelVersion !== 'string' || input.modelVersion.length === 0) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'modelVersion',
        message: 'must be a non-empty string',
      },
    }
  }

  const normalization = validateNormalizationConfig(input.normalization)
  if (!normalization.ok) {
    return normalization
  }

  const scoreWeights = validateScoreWeights(input.scoreWeights)
  if (!scoreWeights.ok) {
    return scoreWeights
  }

  const dimensionWeights = validateDimensionWeights(input.dimensionWeights)
  if (!dimensionWeights.ok) {
    return dimensionWeights
  }

  const tierBounds = validateTierBounds(input.tierBounds)
  if (!tierBounds.ok) {
    return tierBounds
  }

  if (!isObject(input.rampPolicy)) {
    return {
      ok: false,
      error: { kind: 'InvalidDifficultyModel', path: 'rampPolicy', message: 'expected object' },
    }
  }

  const cooldownMaxTierDrop = input.rampPolicy.cooldownMaxTierDrop

  if (
    typeof input.rampPolicy.allowCooldownInMain !== 'boolean' ||
    !isInteger(cooldownMaxTierDrop) ||
    cooldownMaxTierDrop < 0 ||
    typeof input.rampPolicy.allowConsecutiveCooldown !== 'boolean' ||
    typeof input.rampPolicy.requireHardBeforeExpert !== 'boolean'
  ) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'rampPolicy',
        message:
          'expected { allowCooldownInMain:boolean, cooldownMaxTierDrop:int>=0, allowConsecutiveCooldown:boolean, requireHardBeforeExpert:boolean }',
      },
    }
  }

  if (!isObject(input.overridePolicy)) {
    return {
      ok: false,
      error: { kind: 'InvalidDifficultyModel', path: 'overridePolicy', message: 'expected object' },
    }
  }

  const noteRequiredMaxDelta = input.overridePolicy.noteRequiredMaxDelta
  const reviewRequiredAboveDelta = input.overridePolicy.reviewRequiredAboveDelta

  if (
    !isInteger(noteRequiredMaxDelta) ||
    noteRequiredMaxDelta < 0 ||
    !isInteger(reviewRequiredAboveDelta) ||
    reviewRequiredAboveDelta < 0 ||
    typeof input.overridePolicy.requireEvidenceForReview !== 'boolean'
  ) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'overridePolicy',
        message:
          'expected { noteRequiredMaxDelta:int>=0, reviewRequiredAboveDelta:int>=0, requireEvidenceForReview:boolean }',
      },
    }
  }

  if (reviewRequiredAboveDelta < noteRequiredMaxDelta) {
    return {
      ok: false,
      error: {
        kind: 'InvalidDifficultyModel',
        path: 'overridePolicy',
        message: 'reviewRequiredAboveDelta must be >= noteRequiredMaxDelta',
      },
    }
  }

  return {
    ok: true,
    value: {
      schemaVersion: 1,
      modelVersion: input.modelVersion,
      normalization: normalization.value,
      scoreWeights: scoreWeights.value,
      dimensionWeights: dimensionWeights.value,
      tierBounds: tierBounds.value,
      rampPolicy: {
        allowCooldownInMain: input.rampPolicy.allowCooldownInMain,
        cooldownMaxTierDrop,
        allowConsecutiveCooldown: input.rampPolicy.allowConsecutiveCooldown,
        requireHardBeforeExpert: input.rampPolicy.requireHardBeforeExpert,
      },
      overridePolicy: {
        noteRequiredMaxDelta,
        reviewRequiredAboveDelta,
        requireEvidenceForReview: input.overridePolicy.requireEvidenceForReview,
      },
    },
  }
}
