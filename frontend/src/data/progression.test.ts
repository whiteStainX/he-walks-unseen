import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  loadValidatedProgressionFromPublic,
  parseProgressionManifest,
  validateProgressionDifficultyRamp,
  validateProgressionReferences,
} from './progression'

describe('progression manifest', () => {
  it('parses valid progression manifest', () => {
    const parsed = parseProgressionManifest({
      schemaVersion: 1,
      defaultTrack: 'main',
      tracks: [
        {
          id: 'main',
          title: 'Main',
          entries: [
            { packId: 'default' },
            { packId: 'variant', unlock: { kind: 'CompletePack', packId: 'default' } },
          ],
        },
      ],
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    expect(parsed.value.defaultTrack).toBe('main')
    expect(parsed.value.tracks[0]?.entries).toHaveLength(2)
  })

  it('rejects invalid progression shape', () => {
    const parsed = parseProgressionManifest({
      schemaVersion: 1,
      tracks: [],
    })

    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.error.kind).toBe('InvalidProgression')
    }
  })

  it('rejects references to unknown pack ids', () => {
    const parsed = parseProgressionManifest({
      schemaVersion: 1,
      tracks: [{ id: 'main', entries: [{ packId: 'missing' }] }],
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    const validated = validateProgressionReferences(parsed.value, [{ id: 'default' }])
    expect(validated.ok).toBe(false)
    if (!validated.ok) {
      expect(validated.error.kind).toBe('InvalidProgressionReference')
      if (validated.error.kind === 'InvalidProgressionReference') {
        expect(validated.error.packId).toBe('missing')
      }
    }
  })
})

describe('validateProgressionDifficultyRamp', () => {
  const packs = [
    { id: 'p1', difficulty: 'easy' },
    { id: 'p2', difficulty: 'normal' },
    { id: 'p3', difficulty: 'hard' },
    { id: 'p4', difficulty: 'expert' },
  ]

  it('accepts non-decreasing ramp with one cooldown and prior hard before expert', () => {
    const parsed = parseProgressionManifest({
      schemaVersion: 1,
      tracks: [
        {
          id: 'main',
          entries: [
            { packId: 'p1', difficulty: 'easy' },
            { packId: 'p2', difficulty: 'normal' },
            { packId: 'p3', difficulty: 'hard' },
            { packId: 'p2', difficulty: 'normal' },
            { packId: 'p3', difficulty: 'hard' },
            { packId: 'p4', difficulty: 'expert' },
          ],
        },
      ],
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    const validated = validateProgressionDifficultyRamp(parsed.value, packs)
    expect(validated.ok).toBe(true)
  })

  it('rejects cooldown drops greater than one tier', () => {
    const parsed = parseProgressionManifest({
      schemaVersion: 1,
      tracks: [
        {
          id: 'main',
          entries: [
            { packId: 'p3', difficulty: 'hard' },
            { packId: 'p1', difficulty: 'easy' },
          ],
        },
      ],
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    const validated = validateProgressionDifficultyRamp(parsed.value, packs)
    expect(validated.ok).toBe(false)
    if (!validated.ok) {
      expect(validated.error.kind).toBe('InvalidProgressionRamp')
    }
  })

  it('rejects consecutive cooldown slots', () => {
    const parsed = parseProgressionManifest({
      schemaVersion: 1,
      tracks: [
        {
          id: 'main',
          entries: [
            { packId: 'p3', difficulty: 'hard' },
            { packId: 'p2', difficulty: 'normal' },
            { packId: 'p1', difficulty: 'easy' },
          ],
        },
      ],
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    const validated = validateProgressionDifficultyRamp(parsed.value, packs)
    expect(validated.ok).toBe(false)
    if (!validated.ok) {
      expect(validated.error.kind).toBe('InvalidProgressionRamp')
      if (validated.error.kind === 'InvalidProgressionRamp') {
        expect(validated.error.message).toContain('consecutive cooldown')
      }
    }
  })

  it('rejects expert before hard', () => {
    const parsed = parseProgressionManifest({
      schemaVersion: 1,
      tracks: [
        {
          id: 'main',
          entries: [
            { packId: 'p1', difficulty: 'easy' },
            { packId: 'p4', difficulty: 'expert' },
          ],
        },
      ],
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    const validated = validateProgressionDifficultyRamp(parsed.value, packs)
    expect(validated.ok).toBe(false)
    if (!validated.ok) {
      expect(validated.error.kind).toBe('InvalidProgressionRamp')
      if (validated.error.kind === 'InvalidProgressionRamp') {
        expect(validated.error.message).toContain('prior hard slot')
      }
    }
  })

  it('rejects unresolved/unsupported difficulty labels in main track', () => {
    const parsed = parseProgressionManifest({
      schemaVersion: 1,
      tracks: [
        {
          id: 'main',
          entries: [
            { packId: 'p1', difficulty: 'tutorial' },
          ],
        },
      ],
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    const validated = validateProgressionDifficultyRamp(parsed.value, packs)
    expect(validated.ok).toBe(false)
    if (!validated.ok) {
      expect(validated.error.kind).toBe('InvalidProgressionDifficulty')
    }
  })
})

describe('loadValidatedProgressionFromPublic', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('loads progression and validates pack references against manifest', async () => {
    const payloadByPath: Record<string, unknown> = {
      '/data/progression/index.json': {
        schemaVersion: 1,
        defaultTrack: 'main',
        tracks: [
          {
            id: 'main',
            entries: [
              { packId: 'default', difficulty: 'easy' },
              { packId: 'variant', difficulty: 'normal' },
            ],
          },
        ],
      },
      '/data/index.json': {
        schemaVersion: 1,
        packs: [
          { id: 'default', difficulty: 'easy' },
          { id: 'variant', difficulty: 'normal' },
        ],
      },
    }

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input)
      const payload = payloadByPath[path]

      if (!payload) {
        return new Response(null, { status: 404 })
      }

      return new Response(JSON.stringify(payload), { status: 200 })
    }) as typeof fetch

    const loaded = await loadValidatedProgressionFromPublic('/data')

    expect(loaded.ok).toBe(true)
    if (!loaded.ok) {
      return
    }

    expect(loaded.value.tracks[0]?.entries.map((entry) => entry.packId)).toEqual([
      'default',
      'variant',
    ])
  })
})
