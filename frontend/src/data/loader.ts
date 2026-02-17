import type { DetectionConfig } from '../core/detection'
import type { LevelObjectsConfig } from '../core/objects'
import type { Result } from '../core/result'
import type { RiftSettings } from '../core/rift'
import type { ContentLoadError, ContentPack, IconPackConfig } from './contracts'
import {
  buildEnemyDetectionConfigByIdFromContent,
  buildLevelObjectsConfigFromContent,
  deriveRulesDetectionConfig,
} from './contentAdapter'
import { validateContentPack, validateIconPackConfig, validateLevelSymbolSlots } from './validate'

import defaultLevel from './content/default.level.json'
import defaultBehavior from './content/default.behavior.json'
import defaultTheme from './content/default.theme.json'
import defaultRules from './content/default.rules.json'
import defaultIconPack from './content/default.icon-pack.json'

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
  const detectionConfig = deriveRulesDetectionConfig(content)

  return {
    levelObjectsConfig: buildLevelObjectsConfigFromContent(content),
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
    enemyDetectionConfigById: buildEnemyDetectionConfigByIdFromContent(content),
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
  packs: PublicContentPackManifestEntry[]
}

export type PublicContentPackClass =
  | 'curated'
  | 'generated'
  | 'hybrid'
  | 'experimental'

export interface PublicContentPackSourceMeta {
  kind: 'manual' | 'generator'
  seed?: string
  profileId?: string
  author?: string
}

export interface PublicContentPackManifestEntry {
  id: string
  name?: string
  class?: PublicContentPackClass
  difficulty?: string
  tags?: string[]
  source?: PublicContentPackSourceMeta
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isPackClass(value: unknown): value is PublicContentPackClass {
  return (
    value === 'curated' ||
    value === 'generated' ||
    value === 'hybrid' ||
    value === 'experimental'
  )
}

function parsePackSourceMeta(
  entry: Record<string, unknown>,
): Result<PublicContentPackSourceMeta | undefined, PublicContentLoadError> {
  if (entry.source === undefined) {
    return { ok: true, value: undefined }
  }

  if (!isRecord(entry.source)) {
    return {
      ok: false,
      error: { kind: 'InvalidManifest', message: 'Pack source must be an object when provided' },
    }
  }

  if (entry.source.kind !== 'manual' && entry.source.kind !== 'generator') {
    return {
      ok: false,
      error: {
        kind: 'InvalidManifest',
        message: 'Pack source.kind must be manual|generator',
      },
    }
  }

  if (entry.source.seed !== undefined && !isNonEmptyString(entry.source.seed)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidManifest',
        message: 'Pack source.seed must be a non-empty string when provided',
      },
    }
  }

  if (entry.source.profileId !== undefined && !isNonEmptyString(entry.source.profileId)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidManifest',
        message: 'Pack source.profileId must be a non-empty string when provided',
      },
    }
  }

  if (entry.source.author !== undefined && !isNonEmptyString(entry.source.author)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidManifest',
        message: 'Pack source.author must be a non-empty string when provided',
      },
    }
  }

  return {
    ok: true,
    value: {
      kind: entry.source.kind,
      seed: entry.source.seed,
      profileId: entry.source.profileId,
      author: entry.source.author,
    },
  }
}

function parsePackEntry(
  value: unknown,
): Result<PublicContentPackManifestEntry, PublicContentLoadError> {
  if (!isRecord(value) || !isNonEmptyString(value.id)) {
    return {
      ok: false,
      error: { kind: 'InvalidManifest', message: 'Each pack must include non-empty id' },
    }
  }

  if (value.name !== undefined && !isNonEmptyString(value.name)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidManifest',
        message: `Pack ${value.id} name must be a non-empty string when provided`,
      },
    }
  }

  if (value.class !== undefined && !isPackClass(value.class)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidManifest',
        message: `Pack ${value.id} class must be curated|generated|hybrid|experimental`,
      },
    }
  }

  if (value.difficulty !== undefined && !isNonEmptyString(value.difficulty)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidManifest',
        message: `Pack ${value.id} difficulty must be a non-empty string when provided`,
      },
    }
  }

  if (value.tags !== undefined) {
    if (!Array.isArray(value.tags) || !value.tags.every(isNonEmptyString)) {
      return {
        ok: false,
        error: {
          kind: 'InvalidManifest',
          message: `Pack ${value.id} tags must be an array of non-empty strings when provided`,
        },
      }
    }
  }

  const source = parsePackSourceMeta(value)

  if (!source.ok) {
    return source
  }

  return {
    ok: true,
    value: {
      id: value.id,
      name: value.name,
      class: value.class,
      difficulty: value.difficulty,
      tags: value.tags,
      source: source.value,
    },
  }
}

export function parsePublicContentPackManifest(
  input: unknown,
): Result<PublicContentPackManifest, PublicContentLoadError> {
  if (!isRecord(input)) {
    return { ok: false, error: { kind: 'InvalidManifest', message: 'Manifest must be an object' } }
  }

  if (input.schemaVersion !== 1) {
    return {
      ok: false,
      error: {
        kind: 'InvalidManifest',
        message: 'Manifest schemaVersion must be 1',
      },
    }
  }

  if (!Array.isArray(input.packs)) {
    return { ok: false, error: { kind: 'InvalidManifest', message: 'Manifest packs must be an array' } }
  }

  const packs: PublicContentPackManifestEntry[] = []

  for (const entry of input.packs) {
    const parsed = parsePackEntry(entry)

    if (!parsed.ok) {
      return parsed
    }

    packs.push(parsed.value)
  }

  return {
    ok: true,
    value: {
      schemaVersion: 1,
      packs,
    },
  }
}

export async function loadContentPackManifestFromPublic(
  basePath = '/data',
): Promise<Result<PublicContentPackManifest, PublicContentLoadError>> {
  const manifest = await fetchJson(`${basePath}/index.json`)

  if (!manifest.ok) {
    return manifest
  }

  return parsePublicContentPackManifest(manifest.value)
}
