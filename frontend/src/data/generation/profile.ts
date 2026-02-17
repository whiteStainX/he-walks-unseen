import type { Result } from '../../core/result'
import type {
  GenerationQualityWeights,
  GenerationSolverGateProfile,
  GenerationStrategies,
  GenerationDifficultyProfile,
  GenerationProfile,
  MapGenDifficulty,
  PatrolBehaviorStrategy,
  PatrolPathOrderStrategy,
  WallTargetStrategy,
} from './contracts'
import defaultGenerationProfile from '../content/default.generation-profile.json'

export type GenerationProfileError = { kind: 'InvalidGenerationProfile'; message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isIntegerAtLeast(value: unknown, min: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isWallTargetStrategy(value: unknown): value is WallTargetStrategy {
  return value === 'randomRange' || value === 'maxBudget'
}

function isPatrolPathOrderStrategy(value: unknown): value is PatrolPathOrderStrategy {
  return value === 'clockwise' || value === 'shuffled'
}

function isPatrolBehaviorStrategy(value: unknown): value is PatrolBehaviorStrategy {
  return value === 'mixed' || value === 'loop' || value === 'pingpong' || value === 'static'
}

function validateSolverGateProfile(
  value: unknown,
): Result<GenerationSolverGateProfile, GenerationProfileError> {
  if (!isRecord(value)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'solverGate must be an object',
      },
    }
  }

  if (
    !isIntegerAtLeast(value.maxDepthCap, 1) ||
    !isIntegerAtLeast(value.maxNodes, 1) ||
    !isBoolean(value.includePushPull) ||
    !isBoolean(value.includeRift)
  ) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'solverGate values are invalid',
      },
    }
  }

  return {
    ok: true,
    value: {
      maxDepthCap: value.maxDepthCap,
      maxNodes: value.maxNodes,
      includePushPull: value.includePushPull,
      includeRift: value.includeRift,
    },
  }
}

function validateQualityWeights(
  value: unknown,
): Result<GenerationQualityWeights, GenerationProfileError> {
  if (!isRecord(value)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'qualityWeights must be an object',
      },
    }
  }

  if (
    !isIntegerAtLeast(value.baseScore, 0) ||
    !isIntegerAtLeast(value.pathCap, 0) ||
    !isIntegerAtLeast(value.enemyWeight, 0) ||
    !isIntegerAtLeast(value.enemyCap, 0) ||
    !isIntegerAtLeast(value.wallDivisor, 1) ||
    !isIntegerAtLeast(value.wallCap, 0) ||
    !isIntegerAtLeast(value.boxWeight, 0) ||
    !isIntegerAtLeast(value.boxCap, 0)
  ) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'qualityWeights values are invalid',
      },
    }
  }

  return {
    ok: true,
    value: {
      baseScore: value.baseScore,
      pathCap: value.pathCap,
      enemyWeight: value.enemyWeight,
      enemyCap: value.enemyCap,
      wallDivisor: value.wallDivisor,
      wallCap: value.wallCap,
      boxWeight: value.boxWeight,
      boxCap: value.boxCap,
    },
  }
}

function validateStrategies(value: unknown): Result<GenerationStrategies, GenerationProfileError> {
  if (!isRecord(value)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'strategies must be an object',
      },
    }
  }

  if (
    !isWallTargetStrategy(value.wallTarget) ||
    !isPatrolPathOrderStrategy(value.patrolPathOrder) ||
    !isPatrolBehaviorStrategy(value.patrolBehavior)
  ) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'strategies values are invalid',
      },
    }
  }

  return {
    ok: true,
    value: {
      wallTarget: value.wallTarget,
      patrolPathOrder: value.patrolPathOrder,
      patrolBehavior: value.patrolBehavior,
    },
  }
}

function validateDifficultyProfile(
  key: MapGenDifficulty,
  value: unknown,
): Result<GenerationDifficultyProfile, GenerationProfileError> {
  if (!isRecord(value)) {
    return { ok: false, error: { kind: 'InvalidGenerationProfile', message: `difficultyProfiles.${key} must be an object` } }
  }

  if (!isRecord(value.budgets)) {
    return { ok: false, error: { kind: 'InvalidGenerationProfile', message: `difficultyProfiles.${key}.budgets must be an object` } }
  }

  const budgets = value.budgets

  if (
    !isIntegerAtLeast(budgets.maxWalls, 0) ||
    !isIntegerAtLeast(budgets.maxDynamicObjects, 0) ||
    !isIntegerAtLeast(budgets.maxEnemies, 0) ||
    !isIntegerAtLeast(budgets.maxRifts, 0)
  ) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: `difficultyProfiles.${key}.budgets values must be integer >= 0`,
      },
    }
  }

  if (
    typeof value.minWallRatio !== 'number' ||
    value.minWallRatio < 0 ||
    value.minWallRatio > 1
  ) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: `difficultyProfiles.${key}.minWallRatio must be number in [0,1]`,
      },
    }
  }

  if (!isIntegerAtLeast(value.detectionRange, 0)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: `difficultyProfiles.${key}.detectionRange must be integer >= 0`,
      },
    }
  }

  if (!isIntegerAtLeast(value.qualityThreshold, 0)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: `difficultyProfiles.${key}.qualityThreshold must be integer >= 0`,
      },
    }
  }

  return {
    ok: true,
    value: {
      budgets: {
        maxWalls: budgets.maxWalls,
        maxDynamicObjects: budgets.maxDynamicObjects,
        maxEnemies: budgets.maxEnemies,
        maxRifts: budgets.maxRifts,
      },
      minWallRatio: value.minWallRatio,
      detectionRange: value.detectionRange,
      qualityThreshold: value.qualityThreshold,
    },
  }
}

export function validateGenerationProfile(
  input: unknown,
): Result<GenerationProfile, GenerationProfileError> {
  if (!isRecord(input)) {
    return { ok: false, error: { kind: 'InvalidGenerationProfile', message: 'Profile must be an object' } }
  }

  if (input.schemaVersion !== 1) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'schemaVersion must be 1',
      },
    }
  }

  if (typeof input.id !== 'string' || input.id.length === 0) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'id must be a non-empty string',
      },
    }
  }

  if (!isRecord(input.boardMin)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'boardMin must be an object',
      },
    }
  }

  if (
    !isIntegerAtLeast(input.boardMin.width, 2) ||
    !isIntegerAtLeast(input.boardMin.height, 2) ||
    !isIntegerAtLeast(input.boardMin.timeDepth, 1)
  ) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'boardMin values must be integers (width>=2,height>=2,timeDepth>=1)',
      },
    }
  }

  if (!isIntegerAtLeast(input.maxAttempts, 1)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'maxAttempts must be integer >= 1',
      },
    }
  }

  if (input.defaultDifficulty !== 'easy' && input.defaultDifficulty !== 'normal' && input.defaultDifficulty !== 'hard') {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'defaultDifficulty must be easy|normal|hard',
      },
    }
  }

  if (!isIntegerAtLeast(input.startInset, 0) || !isIntegerAtLeast(input.exitInset, 0)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'startInset and exitInset must be integer >= 0',
      },
    }
  }

  if (!isRecord(input.defaultFeatureFlags)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'defaultFeatureFlags must be an object',
      },
    }
  }

  if (
    typeof input.defaultFeatureFlags.allowPull !== 'boolean' ||
    typeof input.defaultFeatureFlags.allowPushChains !== 'boolean' ||
    typeof input.defaultFeatureFlags.allowFutureRifts !== 'boolean'
  ) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'defaultFeatureFlags values must be boolean',
      },
    }
  }

  if (!isRecord(input.interaction)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'interaction must be an object',
      },
    }
  }

  if (
    !isIntegerAtLeast(input.interaction.maxPushChainWhenEnabled, 0) ||
    !isIntegerAtLeast(input.interaction.maxPushChainWhenDisabled, 0)
  ) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'interaction maxPushChain values must be integer >= 0',
      },
    }
  }

  if (!isRecord(input.rift)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'rift must be an object',
      },
    }
  }

  if (!isIntegerAtLeast(input.rift.defaultDelta, 1) || typeof input.rift.baseEnergyCost !== 'number') {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'rift defaults are invalid',
      },
    }
  }

  if (!isRecord(input.detection)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'detection must be an object',
      },
    }
  }

  if (
    typeof input.detection.enabled !== 'boolean' ||
    !isIntegerAtLeast(input.detection.delayTurns, 1)
  ) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'detection values are invalid',
      },
    }
  }

  if (!isRecord(input.theme)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'theme must be an object',
      },
    }
  }

  const solverGate = validateSolverGateProfile(input.solverGate)

  if (!solverGate.ok) {
    return solverGate
  }

  const qualityWeights = validateQualityWeights(input.qualityWeights)

  if (!qualityWeights.ok) {
    return qualityWeights
  }

  const strategies = validateStrategies(input.strategies)

  if (!strategies.ok) {
    return strategies
  }

  if (
    typeof input.theme.id !== 'string' ||
    input.theme.id.length === 0 ||
    typeof input.theme.iconPackId !== 'string' ||
    input.theme.iconPackId.length === 0 ||
    !isRecord(input.theme.cssVars)
  ) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'theme values are invalid',
      },
    }
  }

  if (!isRecord(input.difficultyProfiles)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: 'difficultyProfiles must be an object',
      },
    }
  }

  const easy = validateDifficultyProfile('easy', input.difficultyProfiles.easy)

  if (!easy.ok) {
    return easy
  }

  const normal = validateDifficultyProfile('normal', input.difficultyProfiles.normal)

  if (!normal.ok) {
    return normal
  }

  const hard = validateDifficultyProfile('hard', input.difficultyProfiles.hard)

  if (!hard.ok) {
    return hard
  }

  return {
    ok: true,
    value: {
      schemaVersion: 1,
      id: input.id,
      boardMin: {
        width: input.boardMin.width,
        height: input.boardMin.height,
        timeDepth: input.boardMin.timeDepth,
      },
      maxAttempts: input.maxAttempts,
      defaultDifficulty: input.defaultDifficulty,
      startInset: input.startInset,
      exitInset: input.exitInset,
      defaultFeatureFlags: {
        allowPull: input.defaultFeatureFlags.allowPull,
        allowPushChains: input.defaultFeatureFlags.allowPushChains,
        allowFutureRifts: input.defaultFeatureFlags.allowFutureRifts,
      },
      interaction: {
        maxPushChainWhenEnabled: input.interaction.maxPushChainWhenEnabled,
        maxPushChainWhenDisabled: input.interaction.maxPushChainWhenDisabled,
      },
      rift: {
        defaultDelta: input.rift.defaultDelta,
        baseEnergyCost: input.rift.baseEnergyCost,
      },
      detection: {
        enabled: input.detection.enabled,
        delayTurns: input.detection.delayTurns,
      },
      solverGate: solverGate.value,
      qualityWeights: qualityWeights.value,
      strategies: strategies.value,
      difficultyProfiles: {
        easy: easy.value,
        normal: normal.value,
        hard: hard.value,
      },
      theme: {
        id: input.theme.id,
        iconPackId: input.theme.iconPackId,
        cssVars: input.theme.cssVars as Record<string, string>,
      },
    },
  }
}

export function loadDefaultGenerationProfile(): Result<GenerationProfile, GenerationProfileError> {
  return validateGenerationProfile(defaultGenerationProfile)
}
