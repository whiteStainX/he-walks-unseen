import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  loadValidatedProgressionFromPublic,
  parseProgressionManifest,
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
        tracks: [{ id: 'main', entries: [{ packId: 'default' }, { packId: 'variant' }] }],
      },
      '/data/index.json': {
        schemaVersion: 1,
        packs: [{ id: 'default' }, { id: 'variant' }],
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
