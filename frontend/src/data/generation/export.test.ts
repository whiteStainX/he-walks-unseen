import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadBootContentFromPublic, type PublicContentPackManifest } from '../loader'
import { generateMapPack } from './index'
import {
  appendGeneratedPackToManifest,
  exportGeneratedPackToPublicFiles,
} from './export'

describe('generation export', () => {
  it('serializes generated pack into public-data file set', () => {
    const generated = generateMapPack({
      seed: 'export-alpha',
      board: { width: 12, height: 12, timeDepth: 16 },
      difficulty: 'normal',
      maxAttempts: 8,
    })

    expect(generated.ok).toBe(true)
    if (!generated.ok) {
      return
    }

    const exported = exportGeneratedPackToPublicFiles('generated-alpha', generated.value.content)

    expect(exported.packId).toBe('generated-alpha')
    expect(Object.keys(exported.files).sort()).toEqual([
      'generated-alpha.behavior.json',
      'generated-alpha.level.json',
      'generated-alpha.rules.json',
      'generated-alpha.theme.json',
    ])
  })

  it('appends generated pack to manifest without duplicates', () => {
    const manifest: PublicContentPackManifest = {
      schemaVersion: 1,
      packs: [{ id: 'default', name: 'Default Lab' }],
    }

    const once = appendGeneratedPackToManifest(manifest, {
      id: 'generated-alpha',
      name: 'Generated Alpha',
    })
    const twice = appendGeneratedPackToManifest(once, {
      id: 'generated-alpha',
      name: 'Generated Alpha',
    })

    expect(once.packs.map((entry) => entry.id)).toEqual(['default', 'generated-alpha'])
    expect(twice.packs.map((entry) => entry.id)).toEqual(['default', 'generated-alpha'])
  })
})

describe('generation export loader compatibility', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('loads exported generated files through loadBootContentFromPublic', async () => {
    const generated = generateMapPack({
      seed: 'loader-alpha',
      board: { width: 12, height: 12, timeDepth: 16 },
      difficulty: 'easy',
      maxAttempts: 8,
    })

    expect(generated.ok).toBe(true)
    if (!generated.ok) {
      return
    }

    const packId = 'generated-alpha'
    const exported = exportGeneratedPackToPublicFiles(packId, generated.value.content)
    const payloadByPath: Record<string, unknown> = {}

    for (const [file, json] of Object.entries(exported.files)) {
      payloadByPath[`/data/${file}`] = JSON.parse(json)
    }

    payloadByPath['/data/icons/default-mono.pack.json'] = {
      schemaVersion: 1,
      id: 'default-mono',
      slots: {
        wall: { svg: '/data/icons/default/wall.svg' },
        exit: { svg: '/data/icons/default/exit.svg' },
        box: { svg: '/data/icons/default/box.svg' },
        enemy: { svg: '/data/icons/default/enemy.svg' },
        rift: { svg: '/data/icons/default/rift.svg' },
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

    const loaded = await loadBootContentFromPublic({ packId, basePath: '/data' })

    expect(loaded.ok).toBe(true)
    if (!loaded.ok) {
      return
    }

    expect(loaded.value.boardSize).toBe(generated.value.content.level.map.width)
    expect(loaded.value.timeDepth).toBe(generated.value.content.level.map.timeDepth)
    expect(loaded.value.startPosition).toEqual(generated.value.content.level.map.start)
  })
})
