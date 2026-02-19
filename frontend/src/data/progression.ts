import type { Result } from '../core/result'
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

  return validateProgressionReferences(progression.value, packs.value.packs)
}
