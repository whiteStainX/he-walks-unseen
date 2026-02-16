import { isInBounds, type Position2D, type Position3D } from '../core/position'
import type { Result } from '../core/result'
import type {
  BehaviorConfig,
  ContentLoadError,
  ContentPack,
  GameRulesConfig,
  IconPackConfig,
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
