import { useEffect, useState } from 'react'

import type { ProgressionManifest } from '../../data/progression'
import { loadValidatedProgressionFromPublic } from '../../data/progression'

export const PROGRESSION_STORAGE_KEY = 'hwu.web.progression.v1'

export interface ProgressionSnapshot {
  selectedTrackId: string
  currentEntryIndex: number
  unlockedPackIds: string[]
  completedPackIds: string[]
}

export interface UseProgressionStateResult {
  progressionManifest: ProgressionManifest | null
  progressionState: ProgressionSnapshot | null
  progressionError: string | null
  setSelectedTrack: (trackId: string) => void
  setCurrentEntryIndex: (index: number) => void
  unlockPack: (packId: string) => void
  markPackCompleted: (packId: string) => void
  applyWinForPack: (packId: string) => void
  resetProgression: () => void
}

function collectKnownPackIds(manifest: ProgressionManifest): Set<string> {
  const known = new Set<string>()

  for (const track of manifest.tracks) {
    for (const entry of track.entries) {
      known.add(entry.packId)
    }
  }

  return known
}

function getTrackById(manifest: ProgressionManifest, trackId: string) {
  return manifest.tracks.find((track) => track.id === trackId) ?? null
}

function getDefaultTrackId(manifest: ProgressionManifest): string {
  if (
    manifest.defaultTrack &&
    manifest.tracks.some((track) => track.id === manifest.defaultTrack)
  ) {
    return manifest.defaultTrack
  }

  return manifest.tracks[0]?.id ?? 'main'
}

function ensureTrackEntryUnlock(
  manifest: ProgressionManifest,
  snapshot: ProgressionSnapshot,
): ProgressionSnapshot {
  const track = getTrackById(manifest, snapshot.selectedTrackId)

  if (!track || track.entries.length === 0) {
    return snapshot
  }

  const firstPackId = track.entries[0].packId

  if (snapshot.unlockedPackIds.includes(firstPackId)) {
    return snapshot
  }

  return {
    ...snapshot,
    unlockedPackIds: [...snapshot.unlockedPackIds, firstPackId],
  }
}

function findTrackContainingPack(
  manifest: ProgressionManifest,
  snapshot: ProgressionSnapshot,
  packId: string,
) {
  const selectedTrack = getTrackById(manifest, snapshot.selectedTrackId)

  if (selectedTrack?.entries.some((entry) => entry.packId === packId)) {
    return selectedTrack
  }

  return manifest.tracks.find((track) => track.entries.some((entry) => entry.packId === packId)) ?? null
}

export function createDefaultProgressionSnapshot(
  manifest: ProgressionManifest,
): ProgressionSnapshot {
  const selectedTrackId = getDefaultTrackId(manifest)
  const track = getTrackById(manifest, selectedTrackId)

  return {
    selectedTrackId,
    currentEntryIndex: 0,
    unlockedPackIds: track?.entries[0] ? [track.entries[0].packId] : [],
    completedPackIds: [],
  }
}

export function normalizeProgressionSnapshot(
  manifest: ProgressionManifest,
  snapshot: ProgressionSnapshot,
): ProgressionSnapshot {
  const knownPackIds = collectKnownPackIds(manifest)
  const selectedTrackId = getTrackById(manifest, snapshot.selectedTrackId)
    ? snapshot.selectedTrackId
    : getDefaultTrackId(manifest)
  const selectedTrack = getTrackById(manifest, selectedTrackId)
  const maxIndex = Math.max(0, (selectedTrack?.entries.length ?? 1) - 1)

  const normalized: ProgressionSnapshot = {
    selectedTrackId,
    currentEntryIndex: Math.min(maxIndex, Math.max(0, snapshot.currentEntryIndex)),
    unlockedPackIds: snapshot.unlockedPackIds.filter((packId) => knownPackIds.has(packId)),
    completedPackIds: snapshot.completedPackIds.filter((packId) => knownPackIds.has(packId)),
  }

  return ensureTrackEntryUnlock(manifest, normalized)
}

export function syncProgressionSnapshotToContentPack(
  manifest: ProgressionManifest,
  snapshot: ProgressionSnapshot,
  contentPackId: string,
): ProgressionSnapshot {
  const normalized = normalizeProgressionSnapshot(manifest, snapshot)
  const track = getTrackById(manifest, normalized.selectedTrackId)

  if (!track) {
    return normalized
  }

  const selectedIndex = track.entries.findIndex((entry) => entry.packId === contentPackId)

  if (selectedIndex < 0 || selectedIndex === normalized.currentEntryIndex) {
    return normalized
  }

  return {
    ...normalized,
    currentEntryIndex: selectedIndex,
  }
}

export function applyCompletionToProgressionSnapshot(
  manifest: ProgressionManifest,
  snapshot: ProgressionSnapshot,
  completedPackId: string,
): ProgressionSnapshot {
  const normalized = normalizeProgressionSnapshot(manifest, snapshot)

  if (normalized.completedPackIds.includes(completedPackId)) {
    return normalized
  }

  const completedSet = new Set([...normalized.completedPackIds, completedPackId])
  const unlockedSet = new Set(normalized.unlockedPackIds)
  const track = findTrackContainingPack(manifest, normalized, completedPackId)

  if (track) {
    const index = track.entries.findIndex((entry) => entry.packId === completedPackId)

    if (index >= 0) {
      const nextEntry = track.entries[index + 1]

      if (nextEntry) {
        unlockedSet.add(nextEntry.packId)
      }
    }

    for (const entry of track.entries) {
      if (entry.unlock?.kind === 'CompletePack' && completedSet.has(entry.unlock.packId)) {
        unlockedSet.add(entry.packId)
      }
    }
  }

  return normalizeProgressionSnapshot(manifest, {
    ...normalized,
    unlockedPackIds: [...unlockedSet],
    completedPackIds: [...completedSet],
  })
}

export function parseStoredProgressionSnapshot(
  manifest: ProgressionManifest,
  raw: string | null,
): ProgressionSnapshot {
  if (!raw) {
    return createDefaultProgressionSnapshot(manifest)
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ProgressionSnapshot>

    if (
      typeof parsed.selectedTrackId !== 'string' ||
      typeof parsed.currentEntryIndex !== 'number' ||
      !Array.isArray(parsed.unlockedPackIds) ||
      !Array.isArray(parsed.completedPackIds)
    ) {
      return createDefaultProgressionSnapshot(manifest)
    }

    return normalizeProgressionSnapshot(manifest, {
      selectedTrackId: parsed.selectedTrackId,
      currentEntryIndex: parsed.currentEntryIndex,
      unlockedPackIds: parsed.unlockedPackIds.filter((value): value is string => typeof value === 'string'),
      completedPackIds: parsed.completedPackIds.filter((value): value is string => typeof value === 'string'),
    })
  } catch {
    return createDefaultProgressionSnapshot(manifest)
  }
}

function loadStoredSnapshot(
  manifest: ProgressionManifest,
): ProgressionSnapshot {
  if (typeof window === 'undefined') {
    return createDefaultProgressionSnapshot(manifest)
  }

  return parseStoredProgressionSnapshot(
    manifest,
    window.localStorage.getItem(PROGRESSION_STORAGE_KEY),
  )
}

export function useProgressionState(): UseProgressionStateResult {
  const [progressionManifest, setProgressionManifest] = useState<ProgressionManifest | null>(null)
  const [progressionState, setProgressionState] = useState<ProgressionSnapshot | null>(null)
  const [progressionError, setProgressionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const loaded = await loadValidatedProgressionFromPublic('/data')

      if (cancelled) {
        return
      }

      if (!loaded.ok) {
        setProgressionError(loaded.error.kind)
        return
      }

      const restored = loadStoredSnapshot(loaded.value)

      setProgressionManifest(loaded.value)
      setProgressionState(restored)
      setProgressionError(null)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!progressionManifest || !progressionState || typeof window === 'undefined') {
      return
    }

    const normalized = normalizeProgressionSnapshot(progressionManifest, progressionState)
    window.localStorage.setItem(
      PROGRESSION_STORAGE_KEY,
      JSON.stringify(normalized),
    )
  }, [progressionManifest, progressionState])

  const setSelectedTrack = (trackId: string) => {
    if (!progressionManifest || !progressionState) {
      return
    }

    const next = normalizeProgressionSnapshot(progressionManifest, {
      ...progressionState,
      selectedTrackId: trackId,
      currentEntryIndex: 0,
    })

    setProgressionState(next)
  }

  const setCurrentEntryIndex = (index: number) => {
    if (!progressionManifest || !progressionState) {
      return
    }

    const next = normalizeProgressionSnapshot(progressionManifest, {
      ...progressionState,
      currentEntryIndex: index,
    })

    setProgressionState(next)
  }

  const unlockPack = (packId: string) => {
    if (!progressionManifest || !progressionState) {
      return
    }

    if (progressionState.unlockedPackIds.includes(packId)) {
      return
    }

    const next = normalizeProgressionSnapshot(progressionManifest, {
      ...progressionState,
      unlockedPackIds: [...progressionState.unlockedPackIds, packId],
    })

    setProgressionState(next)
  }

  const markPackCompleted = (packId: string) => {
    if (!progressionManifest || !progressionState) {
      return
    }

    if (progressionState.completedPackIds.includes(packId)) {
      return
    }

    const next = normalizeProgressionSnapshot(progressionManifest, {
      ...progressionState,
      completedPackIds: [...progressionState.completedPackIds, packId],
    })

    setProgressionState(next)
  }

  const resetProgression = () => {
    if (!progressionManifest) {
      return
    }

    setProgressionState(createDefaultProgressionSnapshot(progressionManifest))
  }

  const applyWinForPack = (packId: string) => {
    if (!progressionManifest || !progressionState) {
      return
    }

    const next = applyCompletionToProgressionSnapshot(
      progressionManifest,
      progressionState,
      packId,
    )

    if (
      next.completedPackIds.length === progressionState.completedPackIds.length &&
      next.unlockedPackIds.length === progressionState.unlockedPackIds.length
    ) {
      return
    }

    setProgressionState(next)
  }

  return {
    progressionManifest,
    progressionState,
    progressionError,
    setSelectedTrack,
    setCurrentEntryIndex,
    unlockPack,
    markPackCompleted,
    applyWinForPack,
    resetProgression,
  }
}
