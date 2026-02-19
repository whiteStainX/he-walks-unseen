import { describe, expect, it } from 'vitest'

import {
  createDefaultProgressionSnapshot,
  normalizeProgressionSnapshot,
  parseStoredProgressionSnapshot,
  syncProgressionSnapshotToContentPack,
} from './useProgressionState'
import type { ProgressionManifest } from '../../data/progression'

const fixtureManifest: ProgressionManifest = {
  schemaVersion: 1,
  defaultTrack: 'main',
  tracks: [
    {
      id: 'main',
      entries: [
        { packId: 'default' },
        { packId: 'variant' },
      ],
    },
    {
      id: 'extra',
      entries: [{ packId: 'generated/fixture-001' }],
    },
  ],
}

describe('useProgressionState helpers', () => {
  it('creates default snapshot with first entry unlocked', () => {
    const snapshot = createDefaultProgressionSnapshot(fixtureManifest)

    expect(snapshot.selectedTrackId).toBe('main')
    expect(snapshot.currentEntryIndex).toBe(0)
    expect(snapshot.unlockedPackIds).toEqual(['default'])
    expect(snapshot.completedPackIds).toEqual([])
  })

  it('normalizes snapshot track/index and removes unknown pack ids', () => {
    const snapshot = normalizeProgressionSnapshot(fixtureManifest, {
      selectedTrackId: 'missing',
      currentEntryIndex: 99,
      unlockedPackIds: ['unknown', 'variant'],
      completedPackIds: ['default', 'missing'],
    })

    expect(snapshot.selectedTrackId).toBe('main')
    expect(snapshot.currentEntryIndex).toBe(1)
    expect(snapshot.unlockedPackIds).toEqual(['variant', 'default'])
    expect(snapshot.completedPackIds).toEqual(['default'])
  })

  it('parses stored snapshot and falls back to default on invalid payload', () => {
    const parsed = parseStoredProgressionSnapshot(
      fixtureManifest,
      JSON.stringify({
        selectedTrackId: 'main',
        currentEntryIndex: 1,
        unlockedPackIds: ['default', 'variant'],
        completedPackIds: ['default'],
      }),
    )

    expect(parsed.selectedTrackId).toBe('main')
    expect(parsed.currentEntryIndex).toBe(1)
    expect(parsed.unlockedPackIds).toEqual(['default', 'variant'])
    expect(parsed.completedPackIds).toEqual(['default'])

    const fallback = parseStoredProgressionSnapshot(fixtureManifest, '{invalid json')
    expect(fallback).toEqual(createDefaultProgressionSnapshot(fixtureManifest))
  })

  it('syncs entry pointer to externally selected pack when it is in the selected track', () => {
    const synced = syncProgressionSnapshotToContentPack(
      fixtureManifest,
      {
        selectedTrackId: 'main',
        currentEntryIndex: 0,
        unlockedPackIds: ['default', 'variant'],
        completedPackIds: [],
      },
      'variant',
    )

    expect(synced.currentEntryIndex).toBe(1)
  })
})
