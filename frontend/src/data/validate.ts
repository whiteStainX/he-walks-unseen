import { isInBounds, type Position3D } from '../core/position'
import type { Result } from '../core/result'
import type {
  BehaviorConfig,
  ContentLoadError,
  ContentPack,
  GameRulesConfig,
  LevelConfig,
  ThemeConfig,
} from './contracts'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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
    isInBounds({ x: start.x, y: start.y }, width) &&
    start.y < height

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

function validateArchetypeAndInstanceRefs(
  level: LevelConfig,
  behavior: BehaviorConfig,
): Result<null, ContentLoadError> {
  const instanceIds = new Set(level.instances.map((instance) => instance.id))

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
