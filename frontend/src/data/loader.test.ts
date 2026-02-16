import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  loadBootContentFromPublic,
  loadContentPackManifestFromPublic,
  loadDefaultBootContent,
  loadIconPackFromPublic,
} from './loader'

describe('loadDefaultBootContent', () => {
  it('loads default content and maps baseline runtime settings', () => {
    const result = loadDefaultBootContent()

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.boardSize).toBe(12)
    expect(result.value.timeDepth).toBe(24)
    expect(result.value.startPosition).toEqual({ x: 5, y: 5, t: 0 })
    expect(result.value.iconPackId).toBe('default-mono')
    expect(result.value.detectionConfig.enabled).toBe(true)
    expect(result.value.enemyDetectionConfigById).toEqual({})
    expect(result.value.interactionConfig.maxPushChain).toBe(4)
    expect(result.value.levelObjectsConfig.instances.length).toBeGreaterThan(0)
  })

  it('applies behavior assignment as instance component override', () => {
    const result = loadDefaultBootContent()

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const enemy = result.value.levelObjectsConfig.instances.find((entry) => entry.id === 'enemy.alpha')

    expect(enemy).toBeDefined()
    expect(enemy?.overrides?.components?.some((component) => component.kind === 'Patrol')).toBe(true)
  })
})

describe('loadBootContentFromPublic', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('loads selected public pack id without rebuild-time imports', async () => {
    const payloadByPath: Record<string, unknown> = {
      '/data/variant.level.json': {
        schemaVersion: 1,
        meta: { id: 'v', name: 'v' },
        map: { width: 6, height: 6, timeDepth: 8, start: { x: 1, y: 1, t: 0 } },
        archetypes: {
          enemy: {
            kind: 'enemy',
            components: [{ kind: 'BlocksMovement' }, { kind: 'TimePersistent' }],
            render: {},
          },
        },
        instances: [{ id: 'enemy.v', archetype: 'enemy', position: { x: 2, y: 2, t: 0 } }],
      },
      '/data/variant.behavior.json': {
        schemaVersion: 1,
        policies: { p: { kind: 'Static' } },
        assignments: { 'enemy.v': 'p' },
        detectionProfiles: {
          close: { enabled: true, delayTurns: 1, maxDistance: 1 },
          long: { enabled: true, delayTurns: 2, maxDistance: 6 },
        },
        detectionAssignments: { 'enemy.v': 'long' },
        defaultDetectionProfile: 'close',
      },
      '/data/variant.theme.json': {
        schemaVersion: 1,
        id: 't',
        iconPackId: 'default-mono',
        cssVars: { '--ink': '#111111' },
      },
      '/data/icons/default-mono.pack.json': {
        schemaVersion: 1,
        id: 'default-mono',
        slots: {
          enemy: { svg: '/data/icons/default/enemy.svg' },
        },
      },
      '/data/variant.rules.json': {
        schemaVersion: 1,
        rift: { defaultDelta: 2, baseEnergyCost: 0 },
        interaction: { maxPushChain: 3, allowPull: true },
        detection: { enabled: true, delayTurns: 1, maxDistance: 3 },
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

    const loaded = await loadBootContentFromPublic({ packId: 'variant' })

    expect(loaded.ok).toBe(true)
    if (!loaded.ok) {
      return
    }

    expect(loaded.value.boardSize).toBe(6)
    expect(loaded.value.timeDepth).toBe(8)
    expect(loaded.value.startPosition).toEqual({ x: 1, y: 1, t: 0 })
    expect(loaded.value.iconPackId).toBe('default-mono')
    expect(loaded.value.enemyDetectionConfigById['enemy.v']).toEqual({
      enabled: true,
      delayTurns: 2,
      maxDistance: 6,
    })
  })
})

describe('loadContentPackManifestFromPublic', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('loads valid manifest and returns ordered pack ids', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          schemaVersion: 1,
          packs: [
            { id: 'default', name: 'Default Lab' },
            { id: 'variant', name: 'Variant Hall' },
          ],
        }),
        { status: 200 },
      ),
    ) as typeof fetch

    const manifest = await loadContentPackManifestFromPublic('/data')

    expect(manifest.ok).toBe(true)
    if (!manifest.ok) {
      return
    }

    expect(manifest.value.packs.map((pack) => pack.id)).toEqual(['default', 'variant'])
  })
})

describe('loadIconPackFromPublic', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('loads and validates icon pack manifest', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          schemaVersion: 1,
          id: 'default-mono',
          slots: {
            player: { svg: '/data/icons/default/player.svg' },
          },
        }),
        { status: 200 },
      ),
    ) as typeof fetch

    const pack = await loadIconPackFromPublic({ basePath: '/data/icons', packId: 'default-mono' })

    expect(pack.ok).toBe(true)
    if (!pack.ok) {
      return
    }

    expect(pack.value.id).toBe('default-mono')
    expect(Object.keys(pack.value.slots)).toContain('player')
  })
})
