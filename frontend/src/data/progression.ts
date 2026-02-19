import type { Result } from '../core/result'
import type { DifficultyRampPolicy, DifficultyTier } from './contracts'
import type { PublicContentPackManifestEntry } from './loader'
import { loadContentPackManifestFromPublic } from './loader'

export interface ProgressionUnlockCondition {
  kind: 'CompletePack'
  packId: string
}

export interface ProgressionEntry {
  packId: string
  title?: string
  difficulty?: string
  difficultyTarget?: string
  difficultyFlavor?: string
  tags?: string[]
  unlock?: ProgressionUnlockCondition
}

export interface ProgressionTrack {
  id: string
  title?: string
  entries: ProgressionEntry[]
}

export interface ProgressionManifest {
  schemaVersion: 1
  defaultTrack?: string
  tracks: ProgressionTrack[]
}

export type ProgressionLoadError =
  | { kind: 'FetchFailed'; file: string; status?: number; message: string }
  | { kind: 'InvalidProgression'; message: string }
  | { kind: 'InvalidProgressionReference'; trackId: string; packId: string; message: string }
  | {
      kind: 'InvalidProgressionDifficulty'
      trackId: string
      entryIndex: number
      packId: string
      message: string
    }
  | {
      kind: 'InvalidProgressionRamp'
      trackId: string
      fromEntryIndex: number
      toEntryIndex: number
      fromPackId: string
      toPackId: string
      message: string
    }

const DEFAULT_RAMP_POLICY: DifficultyRampPolicy = {
  allowCooldownInMain: true,
  cooldownMaxTierDrop: 1,
  allowConsecutiveCooldown: false,
  requireHardBeforeExpert: true,
}

function toDifficultyTier(value: string | undefined): DifficultyTier | null {
  if (value === 'easy' || value === 'normal' || value === 'hard' || value === 'expert') {
    return value
  }

  return null
}

function tierValue(tier: DifficultyTier): number {
  switch (tier) {
    case 'easy':
      return 0
    case 'normal':
      return 1
    case 'hard':
      return 2
    case 'expert':
      return 3
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function parseUnlockCondition(
  value: unknown,
): Result<ProgressionUnlockCondition | undefined, ProgressionLoadError> {
  if (value === undefined) {
    return { ok: true, value: undefined }
  }

  if (!isRecord(value)) {
    return {
      ok: false,
      error: { kind: 'InvalidProgression', message: 'entry.unlock must be an object when provided' },
    }
  }

  if (value.kind !== 'CompletePack') {
    return {
      ok: false,
      error: { kind: 'InvalidProgression', message: 'entry.unlock.kind must be CompletePack' },
    }
  }

  if (!isNonEmptyString(value.packId)) {
    return {
      ok: false,
      error: { kind: 'InvalidProgression', message: 'entry.unlock.packId must be a non-empty string' },
    }
  }

  return {
    ok: true,
    value: {
      kind: 'CompletePack',
      packId: value.packId,
    },
  }
}

function parseProgressionEntry(
  value: unknown,
): Result<ProgressionEntry, ProgressionLoadError> {
  if (!isRecord(value) || !isNonEmptyString(value.packId)) {
    return {
      ok: false,
      error: { kind: 'InvalidProgression', message: 'track entry must include non-empty packId' },
    }
  }

  if (value.title !== undefined && !isNonEmptyString(value.title)) {
    return {
      ok: false,
      error: { kind: 'InvalidProgression', message: `entry ${value.packId} title must be non-empty string` },
    }
  }

  if (value.difficulty !== undefined && !isNonEmptyString(value.difficulty)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidProgression',
        message: `entry ${value.packId} difficulty must be non-empty string`,
      },
    }
  }

  if (value.difficultyTarget !== undefined && !isNonEmptyString(value.difficultyTarget)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidProgression',
        message: `entry ${value.packId} difficultyTarget must be non-empty string`,
      },
    }
  }

  if (value.difficultyFlavor !== undefined && !isNonEmptyString(value.difficultyFlavor)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidProgression',
        message: `entry ${value.packId} difficultyFlavor must be non-empty string`,
      },
    }
  }

  if (value.tags !== undefined) {
    if (!Array.isArray(value.tags) || !value.tags.every(isNonEmptyString)) {
      return {
        ok: false,
        error: {
          kind: 'InvalidProgression',
          message: `entry ${value.packId} tags must be an array of non-empty strings`,
        },
      }
    }
  }

  const unlock = parseUnlockCondition(value.unlock)

  if (!unlock.ok) {
    return unlock
  }

  return {
    ok: true,
    value: {
      packId: value.packId,
      title: value.title,
      difficulty: value.difficulty,
      difficultyTarget: value.difficultyTarget,
      difficultyFlavor: value.difficultyFlavor,
      tags: value.tags,
      unlock: unlock.value,
    },
  }
}

function parseTrack(value: unknown): Result<ProgressionTrack, ProgressionLoadError> {
  if (!isRecord(value) || !isNonEmptyString(value.id)) {
    return {
      ok: false,
      error: { kind: 'InvalidProgression', message: 'track must include non-empty id' },
    }
  }

  if (value.title !== undefined && !isNonEmptyString(value.title)) {
    return {
      ok: false,
      error: { kind: 'InvalidProgression', message: `track ${value.id} title must be non-empty string` },
    }
  }

  if (!Array.isArray(value.entries) || value.entries.length === 0) {
    return {
      ok: false,
      error: { kind: 'InvalidProgression', message: `track ${value.id} entries must be a non-empty array` },
    }
  }

  const entries: ProgressionEntry[] = []

  for (const entry of value.entries) {
    const parsed = parseProgressionEntry(entry)

    if (!parsed.ok) {
      return parsed
    }

    entries.push(parsed.value)
  }

  return {
    ok: true,
    value: {
      id: value.id,
      title: value.title,
      entries,
    },
  }
}

export function parseProgressionManifest(
  input: unknown,
): Result<ProgressionManifest, ProgressionLoadError> {
  if (!isRecord(input)) {
    return {
      ok: false,
      error: { kind: 'InvalidProgression', message: 'progression manifest must be an object' },
    }
  }

  if (input.schemaVersion !== 1) {
    return {
      ok: false,
      error: { kind: 'InvalidProgression', message: 'progression schemaVersion must be 1' },
    }
  }

  if (!Array.isArray(input.tracks) || input.tracks.length === 0) {
    return {
      ok: false,
      error: { kind: 'InvalidProgression', message: 'progression tracks must be a non-empty array' },
    }
  }

  if (input.defaultTrack !== undefined && !isNonEmptyString(input.defaultTrack)) {
    return {
      ok: false,
      error: { kind: 'InvalidProgression', message: 'defaultTrack must be non-empty string when provided' },
    }
  }

  const tracks: ProgressionTrack[] = []
  const seenTrackIds = new Set<string>()

  for (const track of input.tracks) {
    const parsed = parseTrack(track)

    if (!parsed.ok) {
      return parsed
    }

    if (seenTrackIds.has(parsed.value.id)) {
      return {
        ok: false,
        error: { kind: 'InvalidProgression', message: `duplicate track id: ${parsed.value.id}` },
      }
    }

    seenTrackIds.add(parsed.value.id)
    tracks.push(parsed.value)
  }

  if (input.defaultTrack !== undefined && !seenTrackIds.has(input.defaultTrack)) {
    return {
      ok: false,
      error: {
        kind: 'InvalidProgression',
        message: `defaultTrack references unknown track id: ${input.defaultTrack}`,
      },
    }
  }

  return {
    ok: true,
    value: {
      schemaVersion: 1,
      defaultTrack: input.defaultTrack,
      tracks,
    },
  }
}

export function validateProgressionReferences(
  manifest: ProgressionManifest,
  packs: PublicContentPackManifestEntry[],
): Result<ProgressionManifest, ProgressionLoadError> {
  const knownPackIds = new Set(packs.map((pack) => pack.id))

  for (const track of manifest.tracks) {
    for (const entry of track.entries) {
      if (!knownPackIds.has(entry.packId)) {
        return {
          ok: false,
          error: {
            kind: 'InvalidProgressionReference',
            trackId: track.id,
            packId: entry.packId,
            message: 'entry packId not found in content-pack manifest',
          },
        }
      }

      if (entry.unlock && !knownPackIds.has(entry.unlock.packId)) {
        return {
          ok: false,
          error: {
            kind: 'InvalidProgressionReference',
            trackId: track.id,
            packId: entry.unlock.packId,
            message: 'unlock packId not found in content-pack manifest',
          },
        }
      }
    }
  }

  return { ok: true, value: manifest }
}

export function validateProgressionDifficultyRamp(
  manifest: ProgressionManifest,
  packs: PublicContentPackManifestEntry[],
  policy: DifficultyRampPolicy = DEFAULT_RAMP_POLICY,
): Result<ProgressionManifest, ProgressionLoadError> {
  const mainTrack = manifest.tracks.find((track) => track.id === 'main')

  if (!mainTrack) {
    return { ok: true, value: manifest }
  }

  const packsById = new Map(packs.map((pack) => [pack.id, pack]))
  let previousTier: DifficultyTier | null = null
  let previousWasCooldown = false
  let seenHardBeforeExpert = false

  for (let index = 0; index < mainTrack.entries.length; index += 1) {
    const entry = mainTrack.entries[index]
    const pack = packsById.get(entry.packId)
    const resolvedTier = toDifficultyTier(entry.difficulty ?? pack?.difficulty)

    if (!resolvedTier) {
      return {
        ok: false,
        error: {
          kind: 'InvalidProgressionDifficulty',
          trackId: mainTrack.id,
          entryIndex: index,
          packId: entry.packId,
          message: 'main track entry must resolve to easy|normal|hard|expert difficulty',
        },
      }
    }

    if (resolvedTier === 'expert' && policy.requireHardBeforeExpert && !seenHardBeforeExpert) {
      return {
        ok: false,
        error: {
          kind: 'InvalidProgressionRamp',
          trackId: mainTrack.id,
          fromEntryIndex: Math.max(0, index - 1),
          toEntryIndex: index,
          fromPackId: index > 0 ? mainTrack.entries[index - 1].packId : entry.packId,
          toPackId: entry.packId,
          message: 'expert slot requires at least one prior hard slot in main track',
        },
      }
    }

    if (previousTier) {
      const previousValue = tierValue(previousTier)
      const currentValue = tierValue(resolvedTier)

      if (currentValue < previousValue) {
        if (!policy.allowCooldownInMain) {
          return {
            ok: false,
            error: {
              kind: 'InvalidProgressionRamp',
              trackId: mainTrack.id,
              fromEntryIndex: index - 1,
              toEntryIndex: index,
              fromPackId: mainTrack.entries[index - 1].packId,
              toPackId: entry.packId,
              message: 'main track must be non-decreasing when cooldowns are disabled',
            },
          }
        }

        const drop = previousValue - currentValue

        if (drop > policy.cooldownMaxTierDrop) {
          return {
            ok: false,
            error: {
              kind: 'InvalidProgressionRamp',
              trackId: mainTrack.id,
              fromEntryIndex: index - 1,
              toEntryIndex: index,
              fromPackId: mainTrack.entries[index - 1].packId,
              toPackId: entry.packId,
              message: `cooldown drop exceeds policy (drop=${drop}, max=${policy.cooldownMaxTierDrop})`,
            },
          }
        }

        if (!policy.allowConsecutiveCooldown && previousWasCooldown) {
          return {
            ok: false,
            error: {
              kind: 'InvalidProgressionRamp',
              trackId: mainTrack.id,
              fromEntryIndex: index - 1,
              toEntryIndex: index,
              fromPackId: mainTrack.entries[index - 1].packId,
              toPackId: entry.packId,
              message: 'consecutive cooldown slots are not allowed',
            },
          }
        }

        previousWasCooldown = true
      } else {
        previousWasCooldown = false
      }
    }

    if (resolvedTier === 'hard') {
      seenHardBeforeExpert = true
    }

    previousTier = resolvedTier
  }

  return { ok: true, value: manifest }
}

async function fetchJson(path: string): Promise<Result<unknown, ProgressionLoadError>> {
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

    return { ok: true, value: await response.json() }
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

export async function loadProgressionManifestFromPublic(
  basePath = '/data',
  progressionPath = 'progression/index.json',
): Promise<Result<ProgressionManifest, ProgressionLoadError>> {
  const progression = await fetchJson(`${basePath}/${progressionPath}`)

  if (!progression.ok) {
    return progression
  }

  return parseProgressionManifest(progression.value)
}

export async function loadValidatedProgressionFromPublic(
  basePath = '/data',
): Promise<Result<ProgressionManifest, ProgressionLoadError>> {
  const [progression, packs] = await Promise.all([
    loadProgressionManifestFromPublic(basePath),
    loadContentPackManifestFromPublic(basePath),
  ])

  if (!progression.ok) {
    return progression
  }

  if (!packs.ok) {
    return {
      ok: false,
      error: {
        kind: 'InvalidProgression',
        message: `content-pack manifest invalid or unavailable: ${packs.error.kind}`,
      },
    }
  }

  const references = validateProgressionReferences(progression.value, packs.value.packs)

  if (!references.ok) {
    return references
  }

  return validateProgressionDifficultyRamp(references.value, packs.value.packs, DEFAULT_RAMP_POLICY)
}
