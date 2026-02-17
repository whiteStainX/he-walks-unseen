import type { Component } from '../core/components'
import type { ObjectArchetype, ObjectInstance, LevelObjectsConfig } from '../core/objects'
import type { Result } from '../core/result'
import type { DetectionConfig } from '../core/detection'
import type { RiftSettings } from '../core/rift'
import type { ContentComponent, ContentLoadError, ContentPack, IconPackConfig } from './contracts'
import { validateContentPack, validateIconPackConfig, validateLevelSymbolSlots } from './validate'
import {
  behaviorToPatrolComponent,
  resolveBehaviorPolicy,
  resolveEnemyDetectionConfig,
} from './behaviorResolver'

import defaultLevel from './content/default.level.json'
import defaultBehavior from './content/default.behavior.json'
import defaultTheme from './content/default.theme.json'
import defaultRules from './content/default.rules.json'
import defaultIconPack from './content/default.icon-pack.json'

function toCoreComponent(component: ContentComponent): Component {
  switch (component.kind) {
    case 'BlocksMovement':
    case 'BlocksVision':
    case 'TimePersistent':
    case 'Exit':
    case 'Pushable':
    case 'Pullable':
      return { kind: component.kind }
    case 'Patrol':
      return { kind: 'Patrol', path: component.path, loops: component.loops }
    case 'Rift':
      return { kind: 'Rift', target: component.target, bidirectional: component.bidirectional }
  }
}

function applyBehaviorComponents(
  baseComponents: Component[],
  policy: ContentPack['behavior']['policies'][string] | undefined,
): Component[] {
  if (!policy) {
    return baseComponents
  }

  const nonPatrol = baseComponents.filter((component) => component.kind !== 'Patrol')

  const patrol = behaviorToPatrolComponent(policy)

  return patrol ? [...nonPatrol, patrol] : nonPatrol
}

function toLevelObjectsConfig(content: ContentPack): LevelObjectsConfig {
  const archetypes: Record<string, ObjectArchetype> = {}

  for (const [key, archetype] of Object.entries(content.level.archetypes)) {
    archetypes[key] = {
      kind: archetype.kind,
      components: archetype.components.map(toCoreComponent),
      render: archetype.render,
    }
  }

  const instances: ObjectInstance[] = content.level.instances.map((instance) => {
    const behaviorPolicy = resolveBehaviorPolicy(content.behavior, instance.id) ?? undefined
    const baseArchetype = archetypes[instance.archetype]

    if (!baseArchetype || !behaviorPolicy) {
      return {
        id: instance.id,
        archetype: instance.archetype,
        position: instance.position,
      }
    }

    const overriddenComponents = applyBehaviorComponents(baseArchetype.components, behaviorPolicy)

    return {
      id: instance.id,
      archetype: instance.archetype,
      position: instance.position,
      overrides: {
        components: overriddenComponents,
      },
    }
  })

  return {
    archetypes,
    instances,
  }
}

function toDetectionConfigFromRules(content: ContentPack): DetectionConfig {
  return {
    enabled: content.rules.detection.enabled,
    delayTurns: content.rules.detection.delayTurns,
    maxDistance: content.rules.detection.maxDistance,
  }
}

function toEnemyDetectionConfigById(content: ContentPack): Record<string, DetectionConfig> {
  const rulesDefault = toDetectionConfigFromRules(content)
  const enemyDetectionConfigById: Record<string, DetectionConfig> = {}
  const profiles = content.behavior.detectionProfiles

  if (!profiles) {
    return enemyDetectionConfigById
  }

  const defaultProfileKey = content.behavior.defaultDetectionProfile
  const hasDefaultProfile = Boolean(defaultProfileKey && profiles[defaultProfileKey])

  for (const instance of content.level.instances) {
    const archetype = content.level.archetypes[instance.archetype]

    if (!archetype || archetype.kind !== 'enemy') {
      continue
    }

    const assignedProfileKey = content.behavior.detectionAssignments?.[instance.id]
    const hasAssignedProfile = Boolean(assignedProfileKey && profiles[assignedProfileKey])

    if (!hasAssignedProfile && !hasDefaultProfile) {
      continue
    }

    enemyDetectionConfigById[instance.id] = resolveEnemyDetectionConfig({
      behavior: content.behavior,
      enemyId: instance.id,
      rulesDefault,
    })
  }

  return enemyDetectionConfigById
}

export interface LoadedBootContent {
  levelObjectsConfig: LevelObjectsConfig
  boardWidth: number
  boardHeight: number
  timeDepth: number
  startPosition: ContentPack['level']['map']['start']
  iconPackId: string
  riftSettings: RiftSettings
  interactionConfig: {
    maxPushChain: number
    allowPull: boolean
  }
  detectionConfig: DetectionConfig
  enemyDetectionConfigById: Record<string, DetectionConfig>
  themeCssVars: Record<string, string>
}

export type PublicContentLoadError =
  | ContentLoadError
  | { kind: 'FetchFailed'; file: string; status?: number; message: string }
  | { kind: 'InvalidManifest'; message: string }

function toLoadedBootContent(content: ContentPack): LoadedBootContent {
  const detectionConfig = toDetectionConfigFromRules(content)

  return {
    levelObjectsConfig: toLevelObjectsConfig(content),
    boardWidth: content.level.map.width,
    boardHeight: content.level.map.height,
    timeDepth: content.level.map.timeDepth,
    startPosition: content.level.map.start,
    iconPackId: content.theme.iconPackId,
    riftSettings: {
      defaultDelta: content.rules.rift.defaultDelta,
      baseEnergyCost: content.rules.rift.baseEnergyCost,
    },
    interactionConfig: {
      maxPushChain: content.rules.interaction.maxPushChain,
      allowPull: content.rules.interaction.allowPull,
    },
    detectionConfig,
    enemyDetectionConfigById: toEnemyDetectionConfigById(content),
    themeCssVars: content.theme.cssVars,
  }
}

export function loadDefaultBootContent(): Result<LoadedBootContent, ContentLoadError> {
  const validated = validateContentPack({
    level: defaultLevel,
    behavior: defaultBehavior,
    theme: defaultTheme,
    rules: defaultRules,
  })

  if (!validated.ok) {
    return validated
  }

  const iconPack = validateIconPackConfig(defaultIconPack)

  if (!iconPack.ok) {
    return iconPack
  }

  const symbolValidation = validateLevelSymbolSlots(validated.value.level, iconPack.value)

  if (!symbolValidation.ok) {
    return symbolValidation
  }

  return { ok: true, value: toLoadedBootContent(validated.value) }
}

async function fetchJson(path: string): Promise<Result<unknown, PublicContentLoadError>> {
  try {
    const response = await fetch(path)

    if (!response.ok) {
      return {
        ok: false,
        error: {
          kind: 'FetchFailed',
          file: path,
          status: response.status,
          message: `HTTP ${response.status}`,
        },
      }
    }

    const value = await response.json()
    return { ok: true, value }
  } catch (error) {
    return {
      ok: false,
      error: {
        kind: 'FetchFailed',
        file: path,
        message: error instanceof Error ? error.message : 'Unknown fetch error',
      },
    }
  }
}

export async function loadBootContentFromPublic(
  options: {
    basePath?: string
    packId?: string
  } = {},
): Promise<Result<LoadedBootContent, PublicContentLoadError>> {
  const basePath = options.basePath ?? '/data'
  const packId = options.packId ?? 'default'

  const [level, behavior, theme, rules] = await Promise.all([
    fetchJson(`${basePath}/${packId}.level.json`),
    fetchJson(`${basePath}/${packId}.behavior.json`),
    fetchJson(`${basePath}/${packId}.theme.json`),
    fetchJson(`${basePath}/${packId}.rules.json`),
  ])

  if (!level.ok) {
    return level
  }

  if (!behavior.ok) {
    return behavior
  }

  if (!theme.ok) {
    return theme
  }

  if (!rules.ok) {
    return rules
  }

  const validated = validateContentPack({
    level: level.value,
    behavior: behavior.value,
    theme: theme.value,
    rules: rules.value,
  })

  if (!validated.ok) {
    return validated
  }

  const iconPack = await loadIconPackFromPublic({
    basePath: `${basePath}/icons`,
    packId: validated.value.theme.iconPackId,
  })

  if (!iconPack.ok) {
    return iconPack
  }

  const symbolValidation = validateLevelSymbolSlots(validated.value.level, iconPack.value)

  if (!symbolValidation.ok) {
    return symbolValidation
  }

  return {
    ok: true,
    value: toLoadedBootContent(validated.value),
  }
}

export async function loadIconPackFromPublic(options: {
  basePath?: string
  packId: string
}): Promise<Result<IconPackConfig, PublicContentLoadError>> {
  const basePath = options.basePath ?? '/data/icons'
  const path = `${basePath}/${options.packId}.pack.json`
  const raw = await fetchJson(path)

  if (!raw.ok) {
    return raw
  }

  const validated = validateIconPackConfig(raw.value)

  if (!validated.ok) {
    return validated
  }

  return validated
}

export interface PublicContentPackManifest {
  schemaVersion: 1
  packs: Array<{
    id: string
    name?: string
  }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function loadContentPackManifestFromPublic(
  basePath = '/data',
): Promise<Result<PublicContentPackManifest, PublicContentLoadError>> {
  const manifest = await fetchJson(`${basePath}/index.json`)

  if (!manifest.ok) {
    return manifest
  }

  if (!isRecord(manifest.value)) {
    return { ok: false, error: { kind: 'InvalidManifest', message: 'Manifest must be an object' } }
  }

  if (manifest.value.schemaVersion !== 1) {
    return {
      ok: false,
      error: {
        kind: 'InvalidManifest',
        message: 'Manifest schemaVersion must be 1',
      },
    }
  }

  if (!Array.isArray(manifest.value.packs)) {
    return { ok: false, error: { kind: 'InvalidManifest', message: 'Manifest packs must be an array' } }
  }

  const packs: PublicContentPackManifest['packs'] = []

  for (const entry of manifest.value.packs) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || entry.id.length === 0) {
      return {
        ok: false,
        error: { kind: 'InvalidManifest', message: 'Each pack must include non-empty id' },
      }
    }

    packs.push({
      id: entry.id,
      name: typeof entry.name === 'string' ? entry.name : undefined,
    })
  }

  return {
    ok: true,
    value: {
      schemaVersion: 1,
      packs,
    },
  }
}
